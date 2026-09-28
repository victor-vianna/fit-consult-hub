import {
  getFirstValidVideoUrl,
  getValidVideoReferences,
} from "../src/utils/videoLinks.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

Deno.test("normalizes and preserves every valid demonstration video", () => {
  const videos = getValidVideoReferences([
    { label: "Agachamento", url: "https://youtu.be/abc123" },
    { label: "Afundo", url: "https://www.youtube.com/watch?v=def456" },
    "https://example.com/video",
  ]);

  assertEquals(
    videos,
    [
      { label: "Agachamento", url: "https://www.youtube.com/watch?v=abc123" },
      { label: "Afundo", url: "https://www.youtube.com/watch?v=def456" },
      { label: "Vídeo 3", url: "https://example.com/video" },
    ],
    "Normalized video list"
  );
});

Deno.test("deduplicates legacy link without losing the custom label", () => {
  const videos = getValidVideoReferences(
    [{ label: "Execução completa", url: "https://youtu.be/abc123" }],
    "https://www.youtube.com/watch?v=abc123"
  );

  assertEquals(
    videos,
    [{ label: "Execução completa", url: "https://www.youtube.com/watch?v=abc123" }],
    "Deduplicated video list"
  );
});

Deno.test("ignores unsafe and invalid URLs", () => {
  const videos = getValidVideoReferences([
    "javascript:alert(1)",
    "not-a-url",
    { label: "Válido", url: "https://example.com/demo" },
  ]);

  assertEquals(
    videos,
    [{ label: "Válido", url: "https://example.com/demo" }],
    "Safe video list"
  );
});

Deno.test("legacy first-video helper remains compatible", () => {
  assertEquals(
    getFirstValidVideoUrl(["invalid", "https://youtu.be/abc123"]),
    "https://www.youtube.com/watch?v=abc123",
    "First valid video"
  );
});
