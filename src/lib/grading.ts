/**
 * Ghana BECE / JHS & Primary Grading System
 *
 * Grade  Interpretation  Score Range
 *   1    Excellent        80 – 100
 *   2    Very Good        70 – 79
 *   3    Good             60 – 69
 *   4    Credit           55 – 59
 *   5    Credit           50 – 54
 *   6    Pass             45 – 49
 *   7    Pass             40 – 44
 *   8    Pass             35 – 39
 *   9    Fail              0 – 34
 */

/** Returns the numeric Ghana grade (1–9) for a given score (0–100). */
export function ghanaGrade(marks: number): number {
  if (marks >= 80) return 1
  if (marks >= 70) return 2
  if (marks >= 60) return 3
  if (marks >= 55) return 4
  if (marks >= 50) return 5
  if (marks >= 45) return 6
  if (marks >= 40) return 7
  if (marks >= 35) return 8
  return 9
}

/** Returns the interpretation string for a given score. */
export function ghanaRemark(marks: number): string {
  if (marks >= 80) return "Excellent"
  if (marks >= 70) return "Very Good"
  if (marks >= 60) return "Good"
  if (marks >= 55) return "Credit"
  if (marks >= 50) return "Credit"
  if (marks >= 45) return "Pass"
  if (marks >= 40) return "Pass"
  if (marks >= 35) return "Pass"
  return "Fail"
}

/** Returns a Tailwind text-color class for a given score. */
export function ghanaGradeColor(marks: number): string {
  if (marks >= 80) return "text-emerald-700"   // Grade 1 – Excellent
  if (marks >= 70) return "text-green-600"      // Grade 2 – Very Good
  if (marks >= 60) return "text-blue-700"       // Grade 3 – Good
  if (marks >= 50) return "text-indigo-600"     // Grade 4–5 – Credit
  if (marks >= 40) return "text-amber-600"      // Grade 6–7 – Pass
  if (marks >= 35) return "text-orange-600"     // Grade 8 – Pass
  return "text-red-600"                         // Grade 9 – Fail
}

/** Full Ghana grade key (for display in report cards). */
export const GHANA_GRADE_KEY = [
  { grade: 1, range: "80–100", remark: "Excellent"  },
  { grade: 2, range: "70–79",  remark: "Very Good"  },
  { grade: 3, range: "60–69",  remark: "Good"       },
  { grade: 4, range: "55–59",  remark: "Credit"     },
  { grade: 5, range: "50–54",  remark: "Credit"     },
  { grade: 6, range: "45–49",  remark: "Pass"       },
  { grade: 7, range: "40–44",  remark: "Pass"       },
  { grade: 8, range: "35–39",  remark: "Pass"       },
  { grade: 9, range: "0–34",   remark: "Fail"       },
] as const
