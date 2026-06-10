export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Area {
  id: number;
  name: string;
  description?: string;
  coordinator_id?: number;
  created_at?: string;
}

export interface ScheduleClass {
  time: string;
  subject: string;
  shared_with?: string;
}

export interface Course {
  id: number;
  name: string;
  schedule?: {
    monday?: ScheduleClass[];
    tuesday?: ScheduleClass[];
    wednesday?: ScheduleClass[];
    thursday?: ScheduleClass[];
    friday?: ScheduleClass[];
  };
}

export interface Subject {
  id: number;
  name: string;
  area_id: number;
}

export interface ProblematicNucleus {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface KnowledgeArea {
  id: number;
  name: string;
  nucleus_id: number;
}

export interface Category {
  id: number;
  name: string;
  knowledge_area_id: number;
  description?: string;
  created_at?: string;
}

// Tipos de estrategia metodológica (valores del backend)
export type StrategyType = 'proyecto' | 'taller_laboratorio' | 'ateneo_debate';

export interface MethodologicalStrategies {
  type: StrategyType;
  context: string;
}

export interface ClassPlanItem {
  class_number: number;
  title: string;
  objective: string;
  date?: string;
  category_ids: number[];
}

export interface SubjectData {
  class_plan: ClassPlanItem[];
}

export interface CoordinationDocument {
  id: number;
  name: string;
  area_id: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'archived';
  problem_edge?: string;
  methodological_strategies?: MethodologicalStrategies;
  eval_criteria?: string;
  subjects_data?: Record<number, SubjectData>;
  nucleus_ids: number[];
  category_ids: number[];
  created_at?: string;
  // Relaciones expandidas (solo en detail response)
  area?: Area;
  subjects?: Subject[];
  categories?: Category[];
  nuclei?: ProblematicNucleus[];
}

export interface CoordinationDocumentCreate {
  name: string;
  area_id: number;
  start_date: string;
  end_date: string;
  problem_edge?: string;
  methodological_strategies?: MethodologicalStrategies;
  eval_criteria?: string;
  subjects_data?: Record<number, SubjectData>;
  nucleus_ids?: number[];
  category_ids?: number[];
}

export interface CoordinationDocumentUpdate {
  name?: string;
  problem_edge?: string;
  methodological_strategies?: MethodologicalStrategies;
  eval_criteria?: string;
  subjects_data?: Record<number, SubjectData>;
  status?: 'draft' | 'published' | 'archived';
}

export interface CourseSubject {
  id: number;
  course_id: number;
  subject_id: number;
  teacher_id: number;
  subject_name: string;
  course_name: string;
}

export interface MomentType {
  id: number;
  name: string;
}

export interface Activity {
  id: number;
  name: string;
  description?: string;
  moment_type: 'apertura' | 'desarrollo' | 'cierre';
}

export interface ActivitiesByMoment {
  apertura: Activity[];
  desarrollo: Activity[];
  cierre: Activity[];
}

export interface ActivityRecommendation {
  apertura_recommended_id: number;
  desarrollo_recommended_ids: number[];
  cierre_recommended_id: number;
}

export interface LessonPlanMoments {
  apertura: { activities: number[] };
  desarrollo: { activities: number[] };
  cierre: { activities: number[] };
}

export interface LessonPlan {
  id: number;
  course_subject_id: number;
  class_number: number;
  title: string;
  objective: string;
  knowledge_content: string;
  didactic_strategies: string;
  class_format: string;
  moments: LessonPlanMoments;
  category_ids: number[];
  custom_instruction?: string;
  resources_mode?: 'global' | 'per_moment';
  global_font_id?: number | null;
  moment_font_ids?: { apertura: number | null; desarrollo: number | null; cierre: number | null };
}

export interface LessonPlanCreate {
  course_subject_id: number;
  coordination_document_id: number;
  class_number: number;
  title?: string;
  category_ids?: number[];
  objective?: string;
  knowledge_content?: string;
  didactic_strategies?: string;
  class_format?: string;
  moments?: LessonPlanMoments;
  custom_instruction?: string | null;
  resources_mode?: 'global' | 'per_moment';
  global_font_id?: number | null;
  moment_font_ids?: { apertura: number | null; desarrollo: number | null; cierre: number | null };
}

export interface Font {
  id: number;
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  thumbnail_url?: string;
  area_id?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  history: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  document?: CoordinationDocument;
}

export interface CoordinationStatusResponse {
  has_published_document: boolean;
  document_id?: number;
  document_name?: string;
  coordinator_name?: string;
  class_plan: ClassPlanItem[];
  subject_category_ids: number[];
  category_ids: number[];
  nucleus_ids: number[];
}

export interface SharedClassNumbersResponse {
  shared_class_numbers: number[];
  shared_class_info: Record<number, string>;
}

export type UserRole = 'coordinator' | 'teacher' | null;

export interface Resource {
  id: number;
  title: string;
  resource_type: 'lecture_guide' | 'course_sheet';
  content: string | null;
  user_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}
