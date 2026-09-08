/**
 * Tiny className combiner. Filters out falsy values so components can write
 * `cn("base", condition && "variant")` without pulling in a dependency.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
