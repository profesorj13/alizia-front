import type {
  ActivitiesByMoment,
  Area,
  Category,
  ChatRequest,
  ChatResponse,
  CoordinationDocument,
  CoordinationDocumentCreate,
  CoordinationDocumentUpdate,
  CoordinationStatusResponse,
  Course,
  CourseSubject,
  Font,
  LessonPlan,
  LessonPlanCreate,
  MomentType,
  ProblematicNucleus,
  SharedClassNumbersResponse,
  Subject,
  User,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function fetchData<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export async function postData<T>(endpoint: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export async function putData<T>(endpoint: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export async function patchData<T>(endpoint: string, data: any): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export async function deleteData<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  users: {
    getAll: () => fetchData<User[]>('/users'),
  },
  courses: {
    getAll: () => fetchData<Course[]>('/courses'),
    getById: (id: number) => fetchData<Course>(`/courses/${id}`),
    getStudents: (id: number) => fetchData<User[]>(`/courses/${id}/students`),
  },
  areas: {
    getAll: () => fetchData<Area[]>('/areas'),
  },
  subjects: {
    getAll: () => fetchData<Subject[]>('/subjects'),
  },
  nuclei: {
    getAll: () => fetchData<ProblematicNucleus[]>('/problematic-nuclei'),
  },
  knowledgeAreas: {
    getAll: () => fetchData('/knowledge-areas'),
  },
  categories: {
    getAll: () => fetchData<Category[]>('/categories'),
  },
  documents: {
    getAll: () => fetchData<CoordinationDocument[]>('/coordination-documents'),
    getById: (id: number) => fetchData<CoordinationDocument>(`/coordination-documents/${id}`),
    create: (data: CoordinationDocumentCreate) => postData<CoordinationDocument>('/coordination-documents', data),
    update: (id: number, data: CoordinationDocumentUpdate) =>
      patchData<CoordinationDocument>(`/coordination-documents/${id}`, data),
    delete: (id: number) => deleteData<{ success: boolean }>(`/coordination-documents/${id}`),
    publish: (id: number) => patchData<CoordinationDocument>(`/coordination-documents/${id}`, { status: 'published' }),
    generate: (id: number, options?: { generate_strategy?: boolean; generate_class_plans?: boolean }) =>
      postData<CoordinationDocument>(`/coordination-documents/${id}/generate`, options || {}),
  },
  courseSubjects: {
    getAll: () => fetchData<CourseSubject[]>('/course-subjects'),
    getById: (id: number) => fetchData<CourseSubject>(`/course-subjects/${id}`),
    getCoordinationStatus: (id: number) =>
      fetchData<CoordinationStatusResponse>(`/course-subjects/${id}/coordination-status`),
    getSharedClassNumbers: (id: number) =>
      fetchData<SharedClassNumbersResponse>(`/course-subjects/${id}/shared-class-numbers`),
    getLessonPlans: (id: number) => fetchData<LessonPlan[]>(`/course-subjects/${id}/lesson-plans`),
  },
  teachers: {
    getCourses: (teacherId: number) => fetchData<Course[]>(`/teachers/${teacherId}/courses`),
  },
  momentTypes: {
    getAll: () => fetchData<MomentType[]>('/moment-types'),
  },
  activities: {
    getAll: () => fetchData<ActivitiesByMoment>('/activities'),
    recommend: (objective: string, categoryIds: number[]) =>
      postData('/activities/recommend', { objective, category_ids: categoryIds }),
  },
  fonts: {
    getAll: (areaId?: number) => fetchData<Font[]>(`/fonts${areaId ? `?area_id=${areaId}` : ''}`),
    getById: (id: number) => fetchData<Font>(`/fonts/${id}`),
  },
  lessonPlans: {
    getAll: () => fetchData<LessonPlan[]>('/lesson-plans'),
    getById: (id: number) => fetchData<LessonPlan>(`/teacher-lesson-plans/${id}`),
    getByCourseSubject: (csId: number) => fetchData<LessonPlan[]>(`/course-subjects/${csId}/lesson-plans`),
    create: (data: LessonPlanCreate) => postData<LessonPlan>('/teacher-lesson-plans', data),
    update: (id: number, data: Partial<LessonPlan>) => patchData<LessonPlan>(`/teacher-lesson-plans/${id}`, data),
    delete: (id: number) => deleteData<{ success: boolean }>(`/teacher-lesson-plans/${id}`),
  },
  chat: {
    sendMessage: (endpoint: string, data: ChatRequest) => postData<ChatResponse>(endpoint, data),
  },
  resources: {
    getAll: (userId?: number) => fetchData(`/resources${userId ? `?user_id=${userId}` : ''}`),
    getById: (id: number) => fetchData(`/resources/${id}`),
    create: (data: { title: string; resource_type: string; user_id: number }) => postData('/resources', data),
    update: (id: number, data: { title?: string; content?: string }) => patchData(`/resources/${id}`, data),
    delete: (id: number) => deleteData(`/resources/${id}`),
  },
};
