export function getPowerSet<T>(elements: T[]) {
  let combinations: T[][] = [[]];

  for (const element of elements) {
    const newCombinations = combinations.map((combination) => [...combination, element]);
    combinations = [...combinations, ...newCombinations];
  }

  return combinations;
}
