import type { Locale } from "@/i18n";
import type { CourseStatus, LessonStatus } from "@/server/learning/types";

const copy = {
  el: {
    myCourseTitle: "Το μάθημά μου",
    myCourseIntro: "Δείτε τα δημοσιευμένα μαθήματα στη γλώσσα του λογαριασμού σας και συνεχίστε από την ακριβή θέση που έχει αποθηκεύσει ο διακομιστής.",
    inProgress: "Σε εξέλιξη",
    available: "Διαθέσιμα",
    completed: "Ολοκληρωμένα",
    emptyTitle: "Δεν υπάρχουν διαθέσιμα μαθήματα",
    emptyDetail: "Δεν υπάρχει ακόμη δημοσιευμένο μάθημα που να ταιριάζει με τη γλώσσα του λογαριασμού σας.",
    emptyNext: "Επιστρέψτε αργότερα ή ελέγξτε τη γλώσσα του προφίλ σας.",
    open: "Άνοιγμα",
    continue: "Συνέχεια",
    resume: "Συνέχιση από το σημείο διακοπής",
    review: "Επανάληψη",
    startCourse: "Έναρξη μαθήματος",
    startLesson: "Έναρξη ενότητας",
    courseProgress: "Πρόοδος μαθήματος",
    lessonProgress: "Πρόοδος ενότητας",
    courseOutline: "Περιεχόμενα μαθήματος",
    learningPoints: "Στοιχεία μάθησης",
    required: "Απαιτούμενο",
    optional: "Προαιρετικό",
    backToMyCourse: "Επιστροφή στο μάθημά μου",
    previousLesson: "Προηγούμενη ενότητα",
    nextLesson: "Επόμενη ενότητα",
    startedHeading: "Η ενότητα ξεκίνησε",
    startedDetail: "Η ώρα έναρξης αποθηκεύτηκε. Τα στοιχεία της ενότητας είναι τώρα διαθέσιμα.",
    startedNext: "Επιλέξτε το πρώτο απαιτούμενο στοιχείο ή επιστρέψτε στα περιεχόμενα.",
    unavailableHeading: "Το περιεχόμενο δεν είναι διαθέσιμο",
    unavailableDetail: "Δεν ήταν δυνατή η πρόσβαση σε αυτό το περιεχόμενο.",
    unavailableNext: "Επιστρέψτε στο μάθημά μου και επιλέξτε ένα διαθέσιμο μάθημα.",
    actionErrorHeading: "Η ενέργεια δεν ολοκληρώθηκε",
    actionErrorDetail: "Η κατάσταση άλλαξε ή η ενέργεια δεν επιτρέπεται.",
    actionErrorNext: "Ελέγξτε την τρέχουσα κατάσταση και δοκιμάστε ξανά με ασφαλή διαθέσιμη ενέργεια.",
    startCourseFirst: "Ξεκινήστε πρώτα το μάθημα για να ανοίξετε τις ενότητες.",
    lessonLocked: "Κλειδωμένη",
    prerequisiteReason: "Ολοκληρώστε πρώτα τις προαπαιτούμενες ενότητες.",
    fallbackCover: "Εξώφυλλο FreeMeditation.gr",
    tutorial: "Κείμενο μάθησης",
    topic: "Θέμα",
    guided_meditation: "Καθοδηγούμενος διαλογισμός",
    quiz: "Κουίζ",
  },
  en: {
    myCourseTitle: "My Course",
    myCourseIntro: "View published courses in your account language and continue from the exact position stored by the server.",
    inProgress: "In Progress",
    available: "Available",
    completed: "Completed",
    emptyTitle: "No courses are available",
    emptyDetail: "There is not yet a published course matching your account language.",
    emptyNext: "Return later or check your profile language.",
    open: "Open",
    continue: "Continue",
    resume: "Resume where you left off",
    review: "Review",
    startCourse: "Start Course",
    startLesson: "Start Lesson",
    courseProgress: "Course progress",
    lessonProgress: "Lesson progress",
    courseOutline: "Course outline",
    learningPoints: "Learning items",
    required: "Required",
    optional: "Optional",
    backToMyCourse: "Back to My Course",
    previousLesson: "Previous lesson",
    nextLesson: "Next lesson",
    startedHeading: "Lesson started",
    startedDetail: "The start time was saved. The lesson items are now available.",
    startedNext: "Choose the first required item or return to the course outline.",
    unavailableHeading: "Content unavailable",
    unavailableDetail: "This content could not be accessed.",
    unavailableNext: "Return to My Course and choose an available course.",
    actionErrorHeading: "The action was not completed",
    actionErrorDetail: "The state changed or the action is not permitted.",
    actionErrorNext: "Check the current state and retry using an available safe action.",
    startCourseFirst: "Start the course before opening its lessons.",
    lessonLocked: "Locked",
    prerequisiteReason: "Complete prerequisite lessons first.",
    fallbackCover: "FreeMeditation.gr course cover",
    tutorial: "Tutorial",
    topic: "Topic",
    guided_meditation: "Guided meditation",
    quiz: "Quiz",
  },
} as const;

export type LearningCopy = { [Key in keyof (typeof copy)["en"]]: string };

export function getLearningCopy(locale: Locale): LearningCopy {
  return copy[locale];
}

export function courseStatusLabel(locale: Locale, status: CourseStatus) {
  const messages = getLearningCopy(locale);
  return status === "in_progress" ? messages.inProgress : status === "completed" ? messages.completed : messages.available;
}

export function lessonStatusLabel(locale: Locale, status: LessonStatus) {
  const messages = getLearningCopy(locale);
  if (status === "locked") return messages.lessonLocked;
  return courseStatusLabel(locale, status);
}