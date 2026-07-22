export const createInstanceId = (
  definitionId: string,
): string => {
  const uniquePart =
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `${definitionId}-${uniquePart}`;
};
