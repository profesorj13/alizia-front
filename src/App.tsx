import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { CoordinatorHome } from './pages/CoordinatorHome';
import { TeacherHome } from './pages/TeacherHome';
import { Course } from './pages/Course';
import { Wizard } from './pages/Wizard';
import { Document } from './pages/Document';
import { TeacherCourseSubject } from './pages/TeacherCourseSubject';
import { TeacherPlanWizard } from './pages/TeacherPlanWizard';
import { TeacherLessonPlan } from './pages/TeacherLessonPlan';
import { Resources } from './pages/Resources';
import { ResourceEditor } from './pages/ResourceEditor';
import { api } from './services/api';

function AuthenticatedRoutes() {
  const currentUser = useStore((state) => state.currentUser);
  const getUserRole = useStore((state) => state.getUserRole);
  const userRole = getUserRole();

  if (!currentUser) return <Login />;

  return (
    <Routes>
      <Route path='/curso/:id/crear' element={<Wizard />} />
      <Route path='/doc/:id' element={<Document />} />
      <Route path='/teacher/plan/:id' element={<TeacherLessonPlan />} />
      <Route path='/recursos/:type/new' element={<ResourceEditor />} />
      <Route path='/recursos/:id' element={<ResourceEditor />} />
      <Route
        path='*'
        element={
          <MainLayout>
            <Routes>
              <Route
                path='/'
                element={
                  userRole === 'coordinator' ? (
                    <CoordinatorHome />
                  ) : userRole === 'teacher' ? (
                    <TeacherHome />
                  ) : (
                    <Navigate to='/' replace />
                  )
                }
              />
              <Route path='/curso/:id' element={<Course />} />
              <Route path='/teacher/cs/:id' element={<TeacherCourseSubject />} />
              <Route path='/teacher/planificar/:csId/:classNumber' element={<TeacherPlanWizard />} />
              <Route path='/recursos' element={<Resources />} />
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </MainLayout>
        }
      />
    </Routes>
  );
}

function App() {
  const currentUser = useStore((state) => state.currentUser);
  const {
    setCourses,
    setAreas,
    setSubjects,
    setNuclei,
    setKnowledgeAreas,
    setCategories,
    setDocuments,
    setCourseSubjects,
    setMomentTypes,
    setActivitiesByMoment,
  } = useStore();

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadAllData = async () => {
    try {
      const [
        courses,
        areas,
        subjects,
        nuclei,
        knowledgeAreas,
        categories,
        documents,
        courseSubjects,
        momentTypes,
        activitiesByMoment,
      ] = await Promise.all([
        api.courses.getAll(),
        api.areas.getAll(),
        api.subjects.getAll(),
        api.nuclei.getAll(),
        api.knowledgeAreas.getAll(),
        api.categories.getAll(),
        api.documents.getAll(),
        api.courseSubjects.getAll(),
        api.momentTypes.getAll(),
        api.activities.getAll(),
      ]);

      setCourses(courses);
      setAreas(areas);
      setSubjects(subjects);
      setNuclei(nuclei as any);
      setKnowledgeAreas(knowledgeAreas as any);
      setCategories(categories as any);
      setDocuments(documents as any);
      setCourseSubjects(courseSubjects as any);
      setMomentTypes(momentTypes as any);
      setActivitiesByMoment(activitiesByMoment as any);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path='*' element={<AuthenticatedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
