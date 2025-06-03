import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("should handle mixed arguments", () => {
    expect(cn("foo", null, undefined, { bar: true }, "baz")).toBe(
      "foo bar baz",
    );
  });

  it("should override conflicting classes with tailwind-merge behavior", () => {
    // twMerge typically takes the last conflicting utility
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-red-500", "bg-blue-500", "p-2", "p-4")).toBe(
      "bg-blue-500 p-4",
    );
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn(null, undefined)).toBe("");
  });

  it("should handle arrays of class names", () => {
    expect(cn(["foo", "bar"], { baz: true })).toBe("foo bar baz");
  });
});
