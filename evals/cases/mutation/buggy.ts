export function sortedScores(scores: number[]): number[] {
  return scores.sort((a, b) => b - a);
}
