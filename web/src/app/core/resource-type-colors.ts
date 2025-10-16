/**
 * Resource Type Color System
 * Consistent color coding for all resource types across the application
 * Following Jony Ive principles: subtle pastels, purposeful differentiation
 */

export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  // Blue palette for Guides - informational, trustworthy
  'Guide': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  'Guides': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',

  // Purple palette for Manuals - instructional, detailed
  'Manual': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  'Manuals': 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',

  // Green palette for Tools - actionable, practical
  'Tool': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  'Tools': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  'Template': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  'Templates': 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',

  // Amber palette for Resources - general, supportive
  'Resource': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'Resources': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',

  // Teal palette for Reports - analytical, data-driven
  'Report': 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  'Reports': 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',

  // Pink palette for Case Studies - examples, stories
  'Case Study': 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
  'Case Studies': 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',

  // Default neutral for unknown types
  'default': 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
};

/**
 * Get the appropriate color classes for a resource type
 * @param type The resource type string
 * @returns Tailwind color classes for the resource type pill
 */
export function getResourceTypeColor(type: string): string {
  return RESOURCE_TYPE_COLORS[type] || RESOURCE_TYPE_COLORS['default'];
}

/**
 * Get just the base colors without hover states
 * Useful for static displays or disabled states
 */
export function getResourceTypeBaseColor(type: string): string {
  const fullClasses = getResourceTypeColor(type);
  // Remove hover classes
  return fullClasses.split(' ').filter(c => !c.startsWith('hover:')).join(' ');
}

/**
 * Get accessible color contrast for WCAG AA compliance
 * Ensures all color combinations meet accessibility standards
 */
export function getAccessibleResourceColor(type: string, highContrast = false): string {
  if (highContrast) {
    // High contrast mode for accessibility
    const baseMap: Record<string, string> = {
      'Guide': 'bg-blue-100 text-blue-900 border-blue-300',
      'Manual': 'bg-purple-100 text-purple-900 border-purple-300',
      'Tool': 'bg-green-100 text-green-900 border-green-300',
      'Resource': 'bg-amber-100 text-amber-900 border-amber-300',
      'Report': 'bg-teal-100 text-teal-900 border-teal-300',
      'Case Study': 'bg-pink-100 text-pink-900 border-pink-300',
      'default': 'bg-gray-100 text-gray-900 border-gray-300'
    };
    return baseMap[type] || baseMap['default'];
  }
  return getResourceTypeColor(type);
}