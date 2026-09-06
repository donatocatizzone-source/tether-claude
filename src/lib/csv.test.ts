import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

// The version this replaced stripped commas out of free-text notes, which
// silently corrupted every exported note containing one. These cases are the
// reason the helper exists.
describe("toCsv", () => {
  it("writes a header row and data rows", () => {
    expect(toCsv(["A", "B"], [["1", "2"]])).toBe("A,B\r\n1,2");
  });

  it("quotes fields containing a comma instead of destroying them", () => {
    expect(toCsv(["Note"], [["Call, then knock"]])).toBe('Note\r\n"Call, then knock"');
  });

  it("escapes embedded quotes by doubling", () => {
    expect(toCsv(["Note"], [['He said "hello"']])).toBe('Note\r\n"He said ""hello"""');
  });

  it("quotes fields containing newlines so rows stay aligned", () => {
    expect(toCsv(["Note"], [["line one\nline two"]])).toBe('Note\r\n"line one\nline two"');
  });

  it("quotes fields with leading or trailing spaces, which are otherwise trimmed by readers", () => {
    expect(toCsv(["Name"], [["  padded  "]])).toBe('Name\r\n"  padded  "');
  });

  it("renders null and undefined as empty, not as the strings 'null'/'undefined'", () => {
    expect(toCsv(["A", "B"], [[null, undefined]])).toBe("A,B\r\n,");
  });

  it("stringifies numbers without quoting them", () => {
    expect(toCsv(["N"], [[42]])).toBe("N\r\n42");
  });

  it("handles zero rows", () => {
    expect(toCsv(["A", "B"], [])).toBe("A,B");
  });
});
