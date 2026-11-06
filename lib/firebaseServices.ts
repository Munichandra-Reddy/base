import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Task, Project, ChatMessage, Person, CheckIn, FileItem } from './types';
import { initialTasks, initialProjects, initialChatMessages } from './data';

export const isRealEmployee = (p: Partial<Person> | null | undefined): boolean => {
  if (!p || !p.email) return false;
  const email = p.email.toLowerCase().trim();
  if (email === 'cr7156816@gmail.com') return false;
  if (email.endsWith('@abctech.com')) return false;
  const dummyIds = ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7'];
  if (p.id && dummyIds.includes(p.id)) return false;
  return true;
};

export const deduplicateEmployees = (peopleList: Person[]): Person[] => {
  if (!Array.isArray(peopleList)) return [];

  const map = new Map<string, Person>();

  for (const person of peopleList) {
    if (!isRealEmployee(person)) continue;
    const cleanEmail = person.email.toLowerCase().trim();

    if (!map.has(cleanEmail)) {
      map.set(cleanEmail, { ...person, email: cleanEmail });
    } else {
      const existing = map.get(cleanEmail)!;
      const isExistingGeneric = !existing.role || existing.role.toLowerCase() === 'team member';
      const isNewSpecific = person.role && person.role.toLowerCase() !== 'team member';

      if (isExistingGeneric && isNewSpecific) {
        map.set(cleanEmail, { ...existing, ...person, email: cleanEmail });
      }
    }
  }

  return Array.from(map.values());
};

// ==========================================
// AUTO-SEED INITIAL DATA TO FIREBASE FIRESTORE
// ==========================================
export const seedInitialDataToFirebase = async () => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('workorbit_firebase_seeded') === 'true') return;
  try {
    for (const t of initialTasks) {
      await setDoc(doc(db, 'tasks', t.id), t, { merge: true });
    }
    for (const pr of initialProjects) {
      await setDoc(doc(db, 'projects', pr.id), pr, { merge: true });
    }
    for (const c of initialChatMessages) {
      await setDoc(doc(db, 'chat_messages', c.id), c, { merge: true });
    }
    // Purge any legacy dummy employee documents from Firestore
    const dummyIds = ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7', 'cr7156816_gmail_com'];
    for (const id of dummyIds) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (e) {}
    }
    localStorage.setItem('workorbit_firebase_seeded', 'true');
  } catch (e) {
    console.error('Firebase seeding error:', e);
  }
};

// ==========================================
// 1. CAMPFIRE CHAT MESSAGES (REAL-TIME SYNC)
// ==========================================
export const subscribeToChatMessages = (
  channel: string,
  callback: (messages: ChatMessage[]) => void
) => {
  if (typeof window === 'undefined') return () => {};
  try {
    const q = query(collection(db, 'chat_messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
          .filter((m) => m.channel === channel);
        callback(msgs);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Chat snapshot sync notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseChatMessage = async (msg: Omit<ChatMessage, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'chat_messages'), {
      ...msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding chat message to Firebase:', error);
  }
};

// ==========================================
// 2. EMPLOYEES & TEAM MEMBERS (REAL-TIME SYNC)
// ==========================================
export const subscribeToEmployees = (callback: (people: Person[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'employees'),
      (snapshot) => {
        const dummyIds = ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7'];
        const seen = new Map<string, { person: Person; docId: string }>();
        const duplicateDocIdsToDelete: string[] = [];

        snapshot.docs.forEach((d) => {
          const data = d.data();
          const email = String(data.email || '').toLowerCase().trim();
          const isDummy =
            dummyIds.includes(d.id) ||
            email === 'cr7156816@gmail.com' ||
            email.endsWith('@abctech.com') ||
            !email;

          if (isDummy) {
            try {
              deleteDoc(doc(db, 'employees', d.id)).catch(() => {});
            } catch (e) {}
            return;
          }

          const personObj: Person = { ...data, id: d.id, email } as Person;
          const deterministicDocId = email.replace(/[^a-zA-Z0-9]/g, '_');

          if (!seen.has(email)) {
            seen.set(email, { person: personObj, docId: d.id });
          } else {
            // Found duplicate document in Firestore for this email!
            const existing = seen.get(email)!;
            const existingRole = (existing.person.role || '').toLowerCase();
            const currentRole = (personObj.role || '').toLowerCase();

            // Best role to keep (prefer specific designation like Developer over generic Team Member)
            const preferredRole =
              existingRole !== 'team member' && existingRole !== ''
                ? existing.person.role
                : personObj.role || 'Team Member';

            // Best name to keep
            const preferredName =
              existing.person.name && existing.person.name !== email.split('@')[0]
                ? existing.person.name
                : personObj.name || existing.person.name;

            // Prefer deterministic document ID based on email
            if (d.id === deterministicDocId && existing.docId !== deterministicDocId) {
              duplicateDocIdsToDelete.push(existing.docId);
              seen.set(email, {
                person: { ...personObj, role: preferredRole, name: preferredName },
                docId: d.id,
              });
            } else if (existing.docId === deterministicDocId && d.id !== deterministicDocId) {
              duplicateDocIdsToDelete.push(d.id);
              seen.set(email, {
                person: { ...existing.person, role: preferredRole, name: preferredName },
                docId: existing.docId,
              });
            } else if (existingRole === 'team member' && currentRole !== 'team member') {
              duplicateDocIdsToDelete.push(existing.docId);
              seen.set(email, { person: personObj, docId: d.id });
            } else {
              duplicateDocIdsToDelete.push(d.id);
            }
          }
        });

        // Clean up duplicate documents from Firestore
        duplicateDocIdsToDelete.forEach((dupId) => {
          try {
            deleteDoc(doc(db, 'employees', dupId)).catch(() => {});
          } catch (e) {}
        });

        const cleanList = Array.from(seen.values()).map((v) => v.person);
        callback(cleanList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Employees snapshot sync notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseEmployee = async (person: Person) => {
  try {
    const cleanEmail = (person.email || '').toLowerCase().trim();
    if (!cleanEmail || cleanEmail === 'cr7156816@gmail.com') return;

    // Use deterministic document ID based on clean email to prevent duplicate documents
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, 'employees', docId);

    await setDoc(docRef, { ...person, id: docId, email: cleanEmail }, { merge: true });
  } catch (error) {
    console.error('Error adding employee to Firebase:', error);
  }
};

export const updateFirebaseEmployee = async (email: string, updates: Partial<Person>) => {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const docRef = doc(db, 'employees', docId);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating employee in Firebase:', error);
  }
};

export const deleteFirebaseEmployee = async (email: string) => {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    await deleteDoc(doc(db, 'employees', docId));
    try {
      await deleteDoc(doc(db, 'user_accounts', docId));
    } catch (e) {}
  } catch (error) {
    console.error('Error deleting employee from Firebase:', error);
  }
};

export interface StoredUserAccount {
  email: string;
  password?: string;
  fullName: string;
  companyName: string;
  role: 'admin' | 'employee';
  designation?: string;
  createdAt?: string;
}

export const addFirebaseUserAccount = async (account: StoredUserAccount) => {
  try {
    const docRef = doc(db, 'user_accounts', account.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'));
    // Secure: Never persist plaintext passwords to Firestore
    const { password, ...safeAccount } = account;
    await setDoc(docRef, safeAccount, { merge: true });
  } catch (error) {
    console.error('Error adding user account to Firebase:', error);
  }
};

export const subscribeToUserAccounts = (callback: (accounts: StoredUserAccount[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'user_accounts'),
      (snapshot) => {
        const accounts: StoredUserAccount[] = snapshot.docs.map((d) => d.data() as StoredUserAccount);
        callback(accounts);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('User accounts snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

// ==========================================
// 3. TASKS MANAGEMENT (REAL-TIME SYNC)
// ==========================================
export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        const tasksList: Task[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
        callback(tasksList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Tasks snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseTask = async (task: Task) => {
  try {
    const docRef = doc(db, 'tasks', task.id);
    await setDoc(docRef, task);
  } catch (error) {
    console.error('Error adding task to Firebase:', error);
  }
};

export const toggleFirebaseTask = async (taskId: string, completed: boolean) => {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, { completed });
  } catch (error) {
    console.error('Error toggling task in Firebase:', error);
  }
};

// ==========================================
// 4. PROJECTS (REAL-TIME SYNC)
// ==========================================
export const subscribeToProjects = (callback: (projects: Project[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const projList: Project[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        callback(projList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Projects snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseProject = async (project: Project) => {
  try {
    const docRef = doc(db, 'projects', project.id);
    await setDoc(docRef, project);
  } catch (error) {
    console.error('Error adding project to Firebase:', error);
  }
};

// ==========================================
// 5. CHECK-INS & FILES
// ==========================================
export const subscribeToCheckIns = (callback: (checkins: CheckIn[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'checkins'),
      (snapshot) => {
        const checkinList: CheckIn[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CheckIn));
        callback(checkinList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Checkins snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseCheckIn = async (checkin: CheckIn) => {
  try {
    const docRef = doc(db, 'checkins', checkin.id);
    await setDoc(docRef, checkin);
  } catch (error) {
    console.error('Error adding check-in to Firebase:', error);
  }
};

export const subscribeToFiles = (callback: (files: FileItem[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'files'),
      (snapshot) => {
        const fileList: FileItem[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FileItem));
        callback(fileList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Files snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseFile = async (file: FileItem) => {
  try {
    const docRef = doc(db, 'files', file.id);
    await setDoc(docRef, file);
  } catch (error) {
    console.error('Error adding file to Firebase:', error);
  }
};
