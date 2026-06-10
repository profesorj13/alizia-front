import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  User,
  Area,
  Course,
  Subject,
  ProblematicNucleus,
  KnowledgeArea,
  Category,
  CoordinationDocument,
  CourseSubject,
  MomentType,
  ActivitiesByMoment,
  ActivityRecommendation,
  LessonPlan,
  LessonPlanMoments,
  ChatMessage,
  UserRole,
  Font,
  Resource,
} from '../types';

interface WizardData {
  step: number;
  name: string;
  areaId: number | null;
  nucleusIds: number[];
  categoryIds: number[];
  startDate: string;
  endDate: string;
  subjectsData: Record<string, any>;
  subjectCategories: Record<string, any>;
  knowledgeAreaId?: number;
  knowledgeAreaName?: string;
  nucleusId?: number;
  nucleusDescription?: string;
}

interface LessonWizardData {
  step: number;
  classNumber: number | null;
  title: string;
  categoryIds: number[];
  objective: string;
  knowledgeContent: string;
  didacticStrategies: string;
  classFormat: string;
  moments: LessonPlanMoments;
  customInstruction: string;
  resourcesMode: 'global' | 'per_moment';
  globalFontId: number | null;
  momentFontIds: { apertura: number | null; desarrollo: number | null; cierre: number | null };
}

interface AppState {
  users: User[];
  currentUser: User | null;
  courses: Course[];
  areas: Area[];
  subjects: Subject[];
  nuclei: ProblematicNucleus[];
  knowledgeAreas: KnowledgeArea[];
  categories: Category[];
  documents: CoordinationDocument[];
  courseSubjects: CourseSubject[];
  momentTypes: MomentType[];
  activitiesByMoment: ActivitiesByMoment;
  activityRecommendations: ActivityRecommendation | null;
  fonts: Font[];
  wizardData: WizardData;
  currentDocument: CoordinationDocument | null;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  expandedSubjects: Record<string, boolean>;
  categoryPickerTarget: string | null;
  teacherCourses: CourseSubject[];
  currentCourseSubject: CourseSubject | null;
  coordinationStatus: any;
  lessonPlans: LessonPlan[];
  lessonWizardData: LessonWizardData;
  currentLessonPlan: LessonPlan | null;
  teacherChatHistory: ChatMessage[];
  resources: Resource[];
  currentResource: Resource | null;

  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  setCourses: (courses: Course[]) => void;
  setAreas: (areas: Area[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setNuclei: (nuclei: ProblematicNucleus[]) => void;
  setKnowledgeAreas: (knowledgeAreas: KnowledgeArea[]) => void;
  setCategories: (categories: Category[]) => void;
  setDocuments: (documents: CoordinationDocument[]) => void;
  setCourseSubjects: (courseSubjects: CourseSubject[]) => void;
  setMomentTypes: (momentTypes: MomentType[]) => void;
  setActivitiesByMoment: (activitiesByMoment: ActivitiesByMoment) => void;
  setActivityRecommendations: (recommendations: ActivityRecommendation | null) => void;
  setFonts: (fonts: Font[]) => void;
  updateWizardData: (data: Partial<WizardData>) => void;
  resetWizardData: () => void;
  setCurrentDocument: (doc: CoordinationDocument | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
  toggleSubjectExpanded: (subjectId: string) => void;
  setCategoryPickerTarget: (target: string | null) => void;
  setTeacherCourses: (courses: CourseSubject[]) => void;
  setCurrentCourseSubject: (cs: CourseSubject | null) => void;
  setCoordinationStatus: (status: any) => void;
  setLessonPlans: (plans: LessonPlan[]) => void;
  updateLessonWizardData: (data: Partial<LessonWizardData>) => void;
  resetLessonWizardData: () => void;
  setCurrentLessonPlan: (plan: LessonPlan | null) => void;
  addTeacherChatMessage: (message: ChatMessage) => void;
  clearTeacherChatHistory: () => void;
  getUserRole: () => UserRole;
  getUserArea: () => Area | undefined;
  setResources: (resources: Resource[]) => void;
  setCurrentResource: (resource: Resource | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      courses: [],
      areas: [],
      subjects: [],
      nuclei: [],
      knowledgeAreas: [],
      categories: [],
      documents: [],
      courseSubjects: [],
      momentTypes: [],
      activitiesByMoment: { apertura: [], desarrollo: [], cierre: [] },
      activityRecommendations: null,
      fonts: [],
      wizardData: {
        step: 1,
        name: '',
        areaId: null,
        nucleusIds: [],
        categoryIds: [],
        startDate: '',
        endDate: '',
        subjectsData: {},
        subjectCategories: {},
      },
      currentDocument: null,
      chatHistory: [],
      isGenerating: false,
      expandedSubjects: {},
      categoryPickerTarget: null,
      teacherCourses: [],
      currentCourseSubject: null,
      coordinationStatus: null,
      lessonPlans: [],
      lessonWizardData: {
        step: 1,
        classNumber: null,
        title: '',
        categoryIds: [],
        objective: '',
        knowledgeContent: '',
        didacticStrategies: '',
        classFormat: '',
        moments: {
          apertura: { activities: [] },
          desarrollo: { activities: [] },
          cierre: { activities: [] },
        },
        customInstruction: '',
        resourcesMode: 'global',
        globalFontId: null,
        momentFontIds: { apertura: null, desarrollo: null, cierre: null },
      },
      currentLessonPlan: null,
      teacherChatHistory: [],
      resources: [],
      currentResource: null,

      setUsers: (users) => set({ users }),
      setCurrentUser: (currentUser) => set({ currentUser }),
      setCourses: (courses) => set({ courses }),
      setAreas: (areas) => set({ areas }),
      setSubjects: (subjects) => set({ subjects }),
      setNuclei: (nuclei) => set({ nuclei }),
      setKnowledgeAreas: (knowledgeAreas) => set({ knowledgeAreas }),
      setCategories: (categories) => set({ categories }),
      setDocuments: (documents) => set({ documents }),
      setCourseSubjects: (courseSubjects) => set({ courseSubjects }),
      setMomentTypes: (momentTypes) => set({ momentTypes }),
      setActivitiesByMoment: (activitiesByMoment) => set({ activitiesByMoment }),
      setActivityRecommendations: (activityRecommendations) => set({ activityRecommendations }),
      setFonts: (fonts) => set({ fonts }),

      updateWizardData: (data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, ...data },
        })),

      resetWizardData: () =>
        set({
          wizardData: {
            step: 1,
            name: '',
            areaId: null,
            nucleusIds: [],
            categoryIds: [],
            startDate: '',
            endDate: '',
            subjectsData: {},
            subjectCategories: {},
          },
        }),

      setCurrentDocument: (currentDocument) => set({ currentDocument }),

      addChatMessage: (message) =>
        set((state) => ({
          chatHistory: [...state.chatHistory, message],
        })),

      clearChatHistory: () => set({ chatHistory: [] }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      toggleSubjectExpanded: (subjectId) =>
        set((state) => ({
          expandedSubjects: {
            ...state.expandedSubjects,
            [subjectId]: !state.expandedSubjects[subjectId],
          },
        })),

      setCategoryPickerTarget: (categoryPickerTarget) => set({ categoryPickerTarget }),
      setTeacherCourses: (teacherCourses) => set({ teacherCourses }),
      setCurrentCourseSubject: (currentCourseSubject) => set({ currentCourseSubject }),
      setCoordinationStatus: (coordinationStatus) => set({ coordinationStatus }),
      setLessonPlans: (lessonPlans) => set({ lessonPlans }),

      updateLessonWizardData: (data) =>
        set((state) => ({
          lessonWizardData: { ...state.lessonWizardData, ...data },
        })),

      resetLessonWizardData: () =>
        set({
          lessonWizardData: {
            step: 1,
            classNumber: null,
            title: '',
            categoryIds: [],
            objective: '',
            knowledgeContent: '',
            didacticStrategies: '',
            classFormat: '',
            moments: {
              apertura: { activities: [] },
              desarrollo: { activities: [] },
              cierre: { activities: [] },
            },
            customInstruction: '',
            resourcesMode: 'global',
            globalFontId: null,
            momentFontIds: { apertura: null, desarrollo: null, cierre: null },
          },
        }),

      setCurrentLessonPlan: (currentLessonPlan) => set({ currentLessonPlan }),

      addTeacherChatMessage: (message) =>
        set((state) => ({
          teacherChatHistory: [...state.teacherChatHistory, message],
        })),

      clearTeacherChatHistory: () => set({ teacherChatHistory: [] }),

      getUserRole: () => {
        const { currentUser, areas, courseSubjects } = get();
        if (!currentUser) return null;

        const isCoordinator = areas.some((a) => a.coordinator_id === currentUser.id);
        const isTeacher = courseSubjects.some((cs) => cs.teacher_id === currentUser.id);

        return isCoordinator ? 'coordinator' : isTeacher ? 'teacher' : null;
      },

      getUserArea: () => {
        const { currentUser, areas } = get();
        if (!currentUser) return undefined;
        return areas.find((a) => a.coordinator_id === currentUser.id);
      },

      setResources: (resources) => set({ resources }),
      setCurrentResource: (currentResource) => set({ currentResource }),
    }),
    {
      // Persist only the session so a full page reload (Vite HMR, refresh) keeps the user logged in.
      // The rest of the data is re-fetched by loadAllData() whenever currentUser is present.
      name: 'av3-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
    },
  ),
);
