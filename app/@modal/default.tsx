// The empty modal slot is part of every route. Without its own setting it would put each route
// under instant-navigation validation, overriding pages that opt out with `instant = false`.
export const instant = false;

export default function DefaultModal() {
  return null;
}
