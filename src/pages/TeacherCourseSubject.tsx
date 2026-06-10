import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { TabsCustom, TabsCustomContent, TabsCustomList, TabsCustomTrigger } from '@/components/ui/tabs-custom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentsList } from '@/components/ui/StudentsList';
import { CourseInfo } from '@/components/ui/CourseInfo';
import { DocumentSectionsList, type DocumentSection, type DocumentTopic } from '@/components/ui/DocumentSectionsList';
import { api } from '@/services/api';
import { ChevronLeft, File } from 'lucide-react';

interface Student {
  id: number;
  name: string;
}

interface CoordinationStatus {
  has_published_document: boolean;
  document_name?: string;
  coordinator_name?: string;
  class_plan?: any[];
  document_id?: number;
  start_date?: string;
  end_date?: string;
}

export function TeacherCourseSubject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const csId = parseInt(id || '0');

  const { courses, courseSubjects, subjects, areas, setCoordinationStatus, setLessonPlans } = useStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [coordStatus, setCoordStatus] = useState<CoordinationStatus | null>(null);
  const [lessonPlans, setLocalLessonPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('about');
  const [isLoading, setIsLoading] = useState(true);

  const cs = courseSubjects.find((c) => c.id === csId);
  const course = cs ? courses.find((c) => c.id === cs.course_id) : null;
  const subject = cs ? subjects.find((s) => s.id === cs.subject_id) : null;
  const subjectArea = subject ? areas.find((a) => a.id === subject.area_id) : null;

  useEffect(() => {
    loadData();
  }, [csId]);

  const loadData = async () => {
    if (!cs) return;

    try {
      setIsLoading(true);
      const [studentsData, coordStatusData, lessonPlansData] = await Promise.all([
        api.courses.getStudents(cs.course_id),
        api.courseSubjects.getCoordinationStatus(csId),
        api.lessonPlans.getByCourseSubject(csId),
      ]);

      setStudents(studentsData as Student[]);
      setCoordStatus(coordStatusData as CoordinationStatus);
      setLocalLessonPlans(lessonPlansData as any[]);
      setCoordinationStatus(coordStatusData);
      setLessonPlans(lessonPlansData as any[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCoordinationDocument = () => {
    if (coordStatus?.document_id) {
      navigate(`/doc/${coordStatus.document_id}?readonly=true`);
    }
  };

  const handleStartPlanWizard = (topicId: number) => {
    // Find the class plan item to get title, objective and category_ids
    const classPlanItem = coordStatus?.class_plan?.find((c: any) => c.class_number === topicId);
    navigate(`/teacher/planificar/${csId}/${topicId}`, {
      state: {
        title: classPlanItem?.title || '',
        objective: classPlanItem?.objective || '',
        categoryIds: classPlanItem?.category_ids || [],
      },
    });
  };

  const handleEditDocument = (documentId: number) => {
    navigate(`/teacher/plan/${documentId}`);
  };

  // Mismo cálculo de semana que el itinerario del coordinador (Document.tsx):
  // 4 clases por semana a partir del start_date del documento.
  const getWeekLabel = (classNumber: number, startDate?: string): string => {
    if (!startDate) return `Semana ${Math.floor((classNumber - 1) / 4) + 1}`;
    const start = new Date(startDate);
    const weekNumber = Math.floor((classNumber - 1) / 4);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + weekNumber * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const fmt = (d: Date) => `${d.getDate()} de ${months[d.getMonth()]}`;
    return `Semana del ${fmt(weekStart)} al ${fmt(weekEnd)}`;
  };

  // Transform class plan data to DocumentSections format, grouped by week (same as the area itinerary).
  const transformToDocumentSections = (): DocumentSection[] => {
    if (!coordStatus?.class_plan || coordStatus.class_plan.length === 0) {
      return [];
    }

    const sortedClasses = [...coordStatus.class_plan].sort((a: any, b: any) => a.class_number - b.class_number);

    const byWeek = new Map<string, any[]>();
    sortedClasses.forEach((c: any) => {
      const label = getWeekLabel(c.class_number, coordStatus.start_date);
      if (!byWeek.has(label)) byWeek.set(label, []);
      byWeek.get(label)!.push(c);
    });

    let sectionId = 0;
    return Array.from(byWeek.entries()).map(([name, classes]): DocumentSection => {
      sectionId += 1;
      return {
        id: sectionId,
        name,
        topics: classes.map((c: any): DocumentTopic & { classType?: string } => {
          const existingPlan = lessonPlanMap[c.class_number];
          return {
            id: c.class_number,
            name: c.title || `Clase ${c.class_number}`,
            status: existingPlan ? (existingPlan.status === 'planned' ? 'completed' : 'in_progress') : 'pending',
            categoriesCount: c.category_ids?.length || 0,
            documentId: existingPlan?.id,
            classType: c.class_type || 'Individual',
          };
        }),
      };
    });
  };

  // Custom badge renderer for teacher view
  const renderTeacherBadge = (topic: DocumentTopic & { classType?: string }) => {
    return (
      <span className="text-xs font-semibold text-foreground">
        Clase {topic.id} • {topic.classType || 'Individual'}
      </span>
    );
  };

  if (!cs || !course) {
    return <div>Curso-materia no encontrado</div>;
  }

  const lessonPlanMap: Record<number, any> = {};
  lessonPlans.forEach((lp) => {
    lessonPlanMap[lp.class_number] = lp;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-4 cursor-pointer transition-colors hover:text-gray-600"
        >
          <ChevronLeft className="text-[#10182B]" />
          <h1 className="title-2-emphasized text-[#10182B]">
            {cs.course_name} - {cs.subject_name}
          </h1>
        </button>

        {coordStatus?.has_published_document && activeTab === 'classes' && (
          <Button
            variant="outline"
            onClick={handleViewCoordinationDocument}
            className="flex items-center gap-2 text-primary bg-muted border-none cursor-pointer rounded-xl hover:bg-muted hover:text-primary"
          >
            <File className="w-4 h-4 text-primary" />
            Itinerario del área
          </Button>
        )}
      </div>

      <TabsCustom value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsCustomList className="mb-8">
          <TabsCustomTrigger value="about">Detalle del curso</TabsCustomTrigger>
          <TabsCustomTrigger value="classes">Mis clases</TabsCustomTrigger>
        </TabsCustomList>

        <TabsCustomContent value="about" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StudentsList students={students} isLoading={isLoading} showActions={false} />

            <CourseInfo
              fields={[
                { label: 'INSTITUCIÓN', value: 'Escuela DEMO' },
                { label: 'ÁREA', value: subjectArea?.name || 'N/A' },
                { label: 'NIVEL', value: 'Secundaria' },
                { label: 'TURNO', value: 'Mañana' },
                { label: 'CICLO LECTIVO', value: '2026' },
              ]}
              showSchedule={true}
            />
          </div>
        </TabsCustomContent>

        <TabsCustomContent value="classes" className="space-y-6">
          {isLoading ? (
            // Skeleton loading state for classes
            <Card className="bg-white/50 backdrop-blur-sm border-slate-200 rounded-3xl">
              <CardContent className="py-12 text-center">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-12 mx-auto rounded-lg" />
                  <Skeleton className="h-6 w-48 mx-auto" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                  <Skeleton className="h-4 w-56 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ) : !coordStatus?.has_published_document ? (
            <Card className="bg-white/50 backdrop-blur-sm border-slate-200 rounded-3xl">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="headline-1-bold text-foreground mb-2">Documento de coordinación no disponible</h3>
                <p className="body-1-regular text-muted-foreground mb-2">
                  El coordinador aún no ha publicado el documento de coordinación para esta materia.
                </p>
                <p className="body-2-regular text-muted-foreground">Contacta al coordinador para más información.</p>
              </CardContent>
            </Card>
          ) : (
            <DocumentSectionsList
              sections={transformToDocumentSections()}
              isLoading={isLoading}
              onCreateDocument={handleStartPlanWizard}
              onEditDocument={handleEditDocument}
              createButtonText="Planificar clase"
              editButtonText="Revisar plan"
              renderBadge={renderTeacherBadge}
            />
          )}
        </TabsCustomContent>
      </TabsCustom>
    </div>
  );
}
