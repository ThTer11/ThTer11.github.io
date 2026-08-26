import { collectToolCourseHintIds } from "./courseHints";

describe("course reminder discovery", () => {
  test("combines tool reminders with nested static banks without duplicates", () => {
    const tool = {
      courseHintIds: ["shared", "tool"],
      source: {
        type: "mix",
        sources: [
          {
            source: {
              type: "bank",
              questions: [
                { courseHintIds: ["shared", "bank-a"] },
                { courseHintIds: ["bank-b"] },
              ],
            },
          },
        ],
      },
    };

    expect(collectToolCourseHintIds(tool)).toEqual(["shared", "tool", "bank-a", "bank-b"]);
  });
});
