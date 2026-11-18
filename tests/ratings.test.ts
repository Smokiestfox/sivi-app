import { describe, expect, it } from "vitest";
import { postPayload } from "../server/posts/payload";

const review = { type: "review", title: "Cafe", content: "Good coffee", placeName: "Cafe A", placeType: "cafe", priceRange: "medium" };

describe("review star ratings", () => {
  it.each([0.5, 1, 2.5, 4.5, 5])("accepts %s stars for every rating", (rating) => {
    const result = postPayload.parse({ ...review, rating, wifiRating: rating, atmosphereRating: rating, serviceRating: rating });
    expect(result).toMatchObject({ rating, wifiRating: rating, atmosphereRating: rating, serviceRating: rating });
  });
  it.each([0, 0.25, 1.1, 4.75, 5.5])("rejects %s stars", (rating) => {
    for (const field of ["rating", "wifiRating", "atmosphereRating", "serviceRating"]) {
      expect(postPayload.safeParse({ ...review, rating: 5, [field]: rating }).success).toBe(false);
    }
  });
  it("allows optional ratings to remain unset", () => {
    expect(postPayload.safeParse({ ...review, rating: 4.5, wifiRating: null }).success).toBe(true);
  });
});
