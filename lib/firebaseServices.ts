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
} from 'firebase/firestore';
import { Task, Project, ChatMessage, Person, CheckIn, FileItem } from './types';
import { initialPeople, initialTasks, initialProjects, initialChatMessages } from './data';

// ==========================================
// AUTO-SEED INITIAL DATA TO FIREBASE FIRESTORE
// ==========================================
export const seedInitialDataToFirebase = async () => {
  if (typeof window === 'undefined') return;
  try {
    for (const p of initialPeople) {
      await setDoc(doc(db, 'employees', p.id), p, { merge: true });
    }
    for (const t of initialTasks) {
      await setDoc(doc(db, 'tasks', t.id), t, { merge: true });
    }
    for (const pr of initialProjects) {
      await setDoc(doc(db, 'projects', pr.id), pr, { merge: true });
    }
    for (const c of initialChatMessages) {
      await setDoc(doc(db, 'chat_messages', c.id), c, { merge: true });
    }
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
      (error) => console.error('Chat snapshot error:', error)
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
        const peopleList: Person[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Person));
        callback(peopleList);
      },
      (error) => console.error('Employees snapshot error:', error)
    );
  } catch (e) {
    return () => {};
  }
};

export const addFirebaseEmployee = async (person: Person) => {
  try {
    const docRef = doc(db, 'employees', person.id);
    await setDoc(docRef, person, { merge: true });
  } catch (error) {
    console.error('Error adding employee to Firebase:', error);
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
      (error) => console.error('Tasks snapshot error:', error)
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
      (error) => console.error('Projects snapshot error:', error)
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
      (error) => console.error('Checkins snapshot error:', error)
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
      (error) => console.error('Files snapshot error:', error)
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
