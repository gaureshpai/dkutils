import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class name inputs and resolve Tailwind CSS utility conflicts into a single class string.
 * @param {...any} inputs - Class name values accepted by clsx (strings, arrays, objects, or mixed values).
 * @returns {string} The consolidated class string with Tailwind utilities merged and conflicts resolved.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}