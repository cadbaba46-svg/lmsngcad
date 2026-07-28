export type CourseContentKind = "syllabus" | "topic" | "content" | "software";
export type CourseContentRequirement = "compulsory" | "elective";

export interface CourseContentItem {
  id: string;
  title: string;
  kind: CourseContentKind;
  requirement: CourseContentRequirement;
}

export interface CourseContentConfig {
  items: CourseContentItem[];
  elective_required_count: number;
}

const kindValues: CourseContentKind[] = ["syllabus", "topic", "content", "software"];
const requirementValues: CourseContentRequirement[] = ["compulsory", "elective"];

export const emptyCourseContentConfig = (): CourseContentConfig => ({
  items: [],
  elective_required_count: 0,
});

export const createCourseContentItem = (title = ""): CourseContentItem => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  title,
  kind: "topic",
  requirement: "compulsory",
});

export const parseCourseContent = (value: unknown): CourseContentConfig => {
  if (!value) return emptyCourseContentConfig();

  if (Array.isArray(value)) {
    return {
      items: value
        .map((entry) => {
          if (typeof entry === "string") return createCourseContentItem(entry);
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Partial<CourseContentItem>;
          const title = String(row.title || "").trim();
          if (!title) return null;
          return {
            id: String(row.id || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`),
            title,
            kind: kindValues.includes(row.kind as CourseContentKind) ? (row.kind as CourseContentKind) : "topic",
            requirement: requirementValues.includes(row.requirement as CourseContentRequirement)
              ? (row.requirement as CourseContentRequirement)
              : "compulsory",
          };
        })
        .filter((item): item is CourseContentItem => Boolean(item)),
      elective_required_count: 0,
    };
  }

  if (typeof value === "object") {
    const config = value as Partial<CourseContentConfig>;
    const parsed = parseCourseContent(config.items || []);
    return {
      items: parsed.items,
      elective_required_count: Math.max(0, Number(config.elective_required_count || 0)),
    };
  }

  return emptyCourseContentConfig();
};

export const serializeCourseContent = (config: CourseContentConfig) => ({
  items: config.items
    .map((item) => ({
      id: item.id,
      title: item.title.trim(),
      kind: item.kind,
      requirement: item.requirement,
    }))
    .filter((item) => item.title),
  elective_required_count: Math.max(0, Number(config.elective_required_count || 0)),
});

export const courseContentKindLabel = (kind: CourseContentKind) => {
  switch (kind) {
    case "syllabus": return "Syllabus";
    case "software": return "Software";
    case "content": return "Content";
    default: return "Topic";
  }
};