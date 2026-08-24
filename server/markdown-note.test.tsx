import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";

describe("directory markdown notes", () => {
  it("renders markdown links without executing raw HTML", () => {
    const html = renderToStaticMarkup(
      <ReactMarkdown>{"[Project brief](https://example.com/brief)\n\n<script>alert('x')</script>"}</ReactMarkdown>,
    );

    expect(html).toContain('href="https://example.com/brief"');
    expect(html).not.toContain("<script>");
  });
});
