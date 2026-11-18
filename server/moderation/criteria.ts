function choice(instructions: string, positive: string, negative: string, match: string, other: string) {
  return {
    match,
    other,
    question: { type: "choice", instructions, criteria: { [match]: positive, [other]: negative } },
  };
}

export const criteria = {
  violence: choice(
    "Does the text contain a credible threat or incitement to physical violence, or graphic violent imagery?",
    "Violent threat, incitement, or graphic violence",
    "Benign text or neutral reporting of violence",
    "violent_threat", "nonviolent",
  ),
  sex: choice(
    "Does the text solicit sex or contain pornography?",
    "Sexual solicitation or pornography",
    "Ordinary non-pornographic content",
    "sexual_solicitation", "nonsexual",
  ),
  ragebait: choice(
    "Is the post trying to start a fight by insulting people?",
    "Mocking or insulting people to start an angry argument",
    "Ordinary writing, including criticism about food or service",
    "yes", "no",
  ),
  review: choice(
    "Is the text a first-hand evaluation?",
    "First-hand review of a place or service",
    "Text without a first-hand evaluation",
    "review", "other",
  ),
  ask: choice(
    "Is the text asking for help or information?",
    "Genuine question or request",
    "Statement or rhetorical question",
    "request", "statement",
  ),
};
