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
      map.set(cleanEmail, {
        ...person,
        email: cleanEmail,
        employeeId: person.employeeId || person.id || cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
        accessRole: person.accessRole || (person.role === 'admin' ? 'admin' : 'employee'),
        status: person.status || 'active',
        department: person.department || 'Engineering',
        joiningDate: person.joiningDate || (person.createdAt ? person.createdAt.split('T')[0] : '2026-11-20'),
      });
    } else {
      const existing = map.get(cleanEmail)!;
      map.set(cleanEmail, {
        ...existing,
        ...person,
        email: cleanEmail,
        employeeId: person.employeeId || existing.employeeId || person.id,
        accessRole: person.accessRole || existing.accessRole || 'employee',
        status: person.status || existing.status || 'active',
        department: person.department || existing.department || 'Engineering',
        joiningDate: person.joiningDate || existing.joiningDate || '2026-11-20',
      });
    }
  }

  return Array.from(map.values());
};

// ==========================================
// PURGE LEGACY DUMMY / HARDCODED DATA FROM FIRESTORE
// ==========================================
export const seedInitialDataToFirebase = async () => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Purge legacy dummy tasks
    const dummyTaskIds = ['t-1', 't-2', 't-3', 't-4', 't-5', 't-6', 'TSK-1001', 'TSK-1002', 'TSK-1003', 'TSK-1004', 'TSK-1005', 'TSK-1006', 'TSK-1007', 'TSK-1008'];
    for (const tid of dummyTaskIds) {
      try {
        await deleteDoc(doc(db, 'tasks', tid));
      } catch (e) {}
    }

    // 2. Purge legacy dummy projects
    const dummyProjIds = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6'];
    for (const pid of dummyProjIds) {
      try {
        await deleteDoc(doc(db, 'projects', pid));
      } catch (e) {}
    }

    // 3. Purge legacy dummy chat messages, checkins, files
    const dummyChatIds = ['c-1', 'c-2', 'c-3'];
    for (const cid of dummyChatIds) {
      try {
        await deleteDoc(doc(db, 'chat_messages', cid));
      } catch (e) {}
    }

    const dummyCheckinIds = ['chk-1', 'chk-2'];
    for (const chkId of dummyCheckinIds) {
      try {
        await deleteDoc(doc(db, 'checkins', chkId));
      } catch (e) {}
    }

    const dummyFileIds = ['f-1', 'f-2', 'f-3', 'f-4'];
    for (const fid of dummyFileIds) {
      try {
        await deleteDoc(doc(db, 'files', fid));
      } catch (e) {}
    }

    // 4. Purge legacy dummy employees
    const dummyEmpIds = ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7', 'cr7156816_gmail_com'];
    for (const id of dummyEmpIds) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (e) {}
    }

    // Clean legacy localStorage caches if they contain dummy items
    ['workorbit_tasks', 'workorbit_projects', 'workorbit_chat_messages', 'workorbit_activities', 'workorbit_checkins', 'workorbit_files'].forEach((key) => {
      const val = localStorage.getItem(key);
      if (val && (val.includes('Rahul Kumar') || val.includes('t-1') || val.includes('p-1'))) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem('workorbit_dummy_purged_v2', 'true');
  } catch (e) {
    console.error('Firebase dummy purge notice:', e);
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

          const personObj: Person = {
            ...data,
            id: d.id,
            email,
            employeeId: data.employeeId || d.id,
            name: data.name || data.fullName || email.split('@')[0],
            role: data.role || data.designation || 'Team Member',
            designation: data.designation || data.role || 'Team Member',
            accessRole: data.accessRole || (data.role === 'admin' ? 'admin' : 'employee'),
            department: data.department || 'Engineering',
            phone: data.phone || '',
            joiningDate: data.joiningDate || (data.createdAt ? data.createdAt.split('T')[0] : '2026-11-20'),
            status: data.status || 'active',
            projectsCount: data.projectsCount || 1,
            avatar: data.avatar || (data.name ? data.name[0].toUpperCase() : 'E'),
            avatarBg: data.avatarBg || 'bg-[#049FD9] text-white',
          } as Person;

          const deterministicDocId = email.replace(/[^a-zA-Z0-9]/g, '_');

          if (!seen.has(email)) {
            seen.set(email, { person: personObj, docId: d.id });
          } else {
            // Found duplicate document in Firestore for this email
            const existing = seen.get(email)!;
            const preferredRole =
              personObj.role && personObj.role.toLowerCase() !== 'team member'
                ? personObj.role
                : existing.person.role;

            const preferredName =
              personObj.name && !personObj.name.includes('@')
                ? personObj.name
                : existing.person.name;

            const mergedPerson: Person = {
              ...existing.person,
              ...personObj,
              role: preferredRole,
              name: preferredName,
              employeeId: personObj.employeeId || existing.person.employeeId,
              accessRole: personObj.accessRole || existing.person.accessRole,
              status: personObj.status || existing.person.status,
              department: personObj.department || existing.person.department,
              joiningDate: personObj.joiningDate || existing.person.joiningDate,
            };

            if (d.id === deterministicDocId && existing.docId !== deterministicDocId) {
              duplicateDocIdsToDelete.push(existing.docId);
              seen.set(email, { person: mergedPerson, docId: d.id });
            } else if (existing.docId === deterministicDocId && d.id !== deterministicDocId) {
              duplicateDocIdsToDelete.push(d.id);
              seen.set(email, { person: mergedPerson, docId: existing.docId });
            } else {
              duplicateDocIdsToDelete.push(d.id);
              seen.set(email, { person: mergedPerson, docId: existing.docId });
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

export const updateEmployeePresence = async (user?: { email?: string; fullName?: string } | null) => {
  if (typeof window === 'undefined' || !user || !user.email) return;
  try {
    const cleanEmail = user.email.toLowerCase().trim();
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const empRef = doc(db, 'employees', docId);
    await setDoc(
      empRef,
      {
        email: cleanEmail,
        name: user.fullName || cleanEmail.split('@')[0],
        lastSeenAt: nowIso,
        lastSeenMs: nowMs,
        isOnline: true,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch (error) {
    // Fail silently without disrupting user experience if network is offline
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
        const tasksList: Task[] = snapshot.docs.map((d, idx) => {
          const data = d.data();
          const isCompleted = Boolean(data.completed || data.status === 'completed');
          let status: any = data.status || (isCompleted ? 'completed' : 'pending');
          const todayStr = new Date().toISOString().split('T')[0];

          let taskId = data.taskId;
          if (!taskId) {
            const numericPart = (d.id || '').replace(/[^0-9]/g, '');
            if (numericPart.length >= 4) {
              taskId = `TSK-${numericPart.slice(-4)}`;
            } else {
              taskId = `TSK-${String(1001 + idx).padStart(4, '0')}`;
            }
          }

          return {
            id: d.id,
            taskId,
            title: data.title || 'Untitled Task',
            description: data.description || '',
            project: data.project || data.projectName || 'General',
            projectId: data.projectId || '',
            completed: isCompleted,
            status,
            priority: (data.priority || 'medium').toLowerCase(),
            assignedTo: data.assignedTo || 'Unassigned',
            assignedToId: data.assignedToId || data.assignedToUid || '',
            assignedToEmail: data.assignedToEmail || '',
            assignedToRole: data.assignedToRole || data.assignedToDesignation || '',
            assignedToDept: data.assignedToDept || data.assignedToDepartment || '',
            assignedBy: data.assignedBy || 'Admin',
            assignedByName: data.assignedByName || 'Workspace Administrator',
            startDate: data.startDate || todayStr,
            dueDate: data.dueDate || todayStr,
            progress: typeof data.progress === 'number' ? data.progress : isCompleted ? 100 : 0,
            instructions: data.instructions || '',
            adminNotes: data.adminNotes || '',
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            comments: Array.isArray(data.comments) ? data.comments : [],
            submissions: Array.isArray(data.submissions) ? data.submissions : [],
            activities: Array.isArray(data.activities) ? data.activities : [],
            createdAt: data.createdAt || todayStr,
            updatedAt: data.updatedAt || todayStr,
            startedAt: data.startedAt || '',
            submittedAt: data.submittedAt || '',
            completedAt: data.completedAt || '',
          } as Task;
        });
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
    const nowIso = new Date().toISOString();
    await updateDoc(taskRef, {
      completed,
      status: completed ? 'completed' : 'in_progress',
      progress: completed ? 100 : 50,
      updatedAt: nowIso,
      completedAt: completed ? nowIso : '',
    });
  } catch (error) {
    console.error('Error toggling task in Firebase:', error);
  }
};

export const deleteFirebaseTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    console.error('Error deleting task in Firebase:', error);
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
    await setDoc(docRef, project, { merge: true });
  } catch (error) {
    console.error('Error adding project to Firebase:', error);
  }
};

export const updateFirebaseProject = async (id: string, updates: Partial<Project>) => {
  try {
    const docRef = doc(db, 'projects', id);
    await setDoc(docRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.error('Error updating project in Firebase:', error);
  }
};

export const deleteFirebaseProject = async (id: string) => {
  try {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting project in Firebase:', error);
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

// ==========================================
// 6. DEPARTMENTS & DESIGNATIONS (REAL-TIME SYNC)
// ==========================================
export const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'General',
];

export const DEFAULT_DESIGNATIONS = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Engineer',
  'UI/UX Designer',
  'Product Manager',
  'Project Manager',
  'Business Analyst',
  'HR Executive',
  'Marketing Executive',
  'Team Lead',
  'QA Engineer',
];

export const subscribeToDepartments = (callback: (depts: string[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'departments'),
      (snapshot) => {
        if (snapshot.empty) {
          callback(DEFAULT_DEPARTMENTS);
        } else {
          const names = snapshot.docs.map((d) => d.data().name || d.id).filter(Boolean);
          callback(names.length > 0 ? names : DEFAULT_DEPARTMENTS);
        }
      },
      () => {
        callback(DEFAULT_DEPARTMENTS);
      }
    );
  } catch (e) {
    callback(DEFAULT_DEPARTMENTS);
    return () => {};
  }
};

export const subscribeToDesignations = (callback: (desigs: string[]) => void) => {
  if (typeof window === 'undefined') return () => {};
  try {
    return onSnapshot(
      collection(db, 'designations'),
      (snapshot) => {
        if (snapshot.empty) {
          callback(DEFAULT_DESIGNATIONS);
        } else {
          const names = snapshot.docs.map((d) => d.data().name || d.id).filter(Boolean);
          callback(names.length > 0 ? names : DEFAULT_DESIGNATIONS);
        }
      },
      () => {
        callback(DEFAULT_DESIGNATIONS);
      }
    );
  } catch (e) {
    callback(DEFAULT_DESIGNATIONS);
    return () => {};
  }
};

export const recordEmployeeActivity = async (entry: {
  employeeId?: string;
  employeeEmail?: string;
  employeeName?: string;
  type: string;
  description: string;
  performedBy?: string;
}) => {
  try {
    const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const actRef = doc(db, 'activityLogs', actId);
    await setDoc(actRef, {
      id: actId,
      ...entry,
      performedBy: entry.performedBy || 'Admin',
      timestamp: new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error('Error logging activity:', e);
  }
};
