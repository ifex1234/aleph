export function amountToMinor(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return (
    BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"))
  );
}

export function amountsMatch(expected: string, actual: string): boolean {
  const left = amountToMinor(expected);
  const right = amountToMinor(actual);
  return left !== null && right !== null && left === right;
}
