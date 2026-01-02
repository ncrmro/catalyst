/**
 * Card component - Re-export of GlassCard from tetrastack
 *
 * This re-export ensures consistent styling and maintainability across the application.
 * Always import Card from here rather than directly from tetrastack.
 *
 * @example
 * ```tsx
 * import { Card } from "@/components/ui/card";
 *
 * <Card>
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 */

export type { GlassCardProps as CardProps } from "@tetrastack/react-glass-components";
export { GlassCard as Card } from "@tetrastack/react-glass-components";
