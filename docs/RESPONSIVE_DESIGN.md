# Building Desktop-Friendly, Mobile-Ready Components

This guide explains how to build components that adapt to different screen sizes, utilizing more space on desktop while remaining mobile-friendly.

## Understanding the Layout

### Why Empty Space on the Sides?

The "columns" (empty space) on desktop exist because we use a **max-width constraint** (1400px) to:
- **Improve readability**: Wide text lines are hard to read
- **Maintain visual hierarchy**: Constrained layouts look more professional
- **Prevent UI stretching**: Some components look bad when stretched too wide

This is standard web design practice (see Medium, Twitter, GitHub, etc.).

## Building Adaptive Components

### Pattern 1: Responsive Columns

Use `useResponsiveLayout()` to adapt grid layouts:

```tsx
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export function ResponsiveGrid() {
  const { gridColumns, contentPadding, itemGap } = useResponsiveLayout();
  
  return (
    <View style={{ padding: contentPadding }}>
      <View style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: itemGap,
      }}>
        {items.map(item => (
          <View 
            key={item.id}
            style={{ width: `${100 / gridColumns - 2}%` }}
          >
            {/* Item content */}
          </View>
        ))}
      </View>
    </View>
  );
}
```

### Pattern 2: Sidebar on Desktop, Stacked on Mobile

```tsx
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export function TwoColumnLayout() {
  const { isDesktop, contentPadding } = useResponsiveLayout();
  
  return (
    <View style={{
      flexDirection: isDesktop ? "row" : "column",
      padding: contentPadding,
      gap: 20,
    }}>
      {/* Main content */}
      <View style={{ flex: isDesktop ? 3 : 1 }}>
        <Text>Main content here</Text>
      </View>
      
      {/* Sidebar - appears on right on desktop, below on mobile */}
      <View style={{ flex: isDesktop ? 1 : undefined }}>
        <Text>Sidebar content</Text>
      </View>
    </View>
  );
}
```

### Pattern 3: Different Layouts by Screen Size

```tsx
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export function AdaptiveCard() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();
  
  if (isMobile) {
    return <MobileCardView />;
  }
  
  if (isTablet) {
    return <TabletCardView />;
  }
  
  return <DesktopCardView />;
}
```

### Pattern 4: Responsive Typography

```tsx
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";

export function ResponsiveText() {
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();
  
  const fontSize = isMobile ? 14 : isTablet ? 16 : 18;
  const lineHeight = fontSize * 1.5;
  
  return (
    <Text style={{ fontSize, lineHeight }}>
      This text scales with screen size
    </Text>
  );
}
```

## Real Example: Profile Card Grid

The app already uses responsive design in the Discover screen:

```tsx
// app/(tabs)/index.tsx
const { cardWidthPercent } = useProfileGridLayout();

// ProfileCard adapts its width:
// - Mobile (< 480px): 48% width (2 columns)
// - Tablet (480-719px): 31% width (3 columns)
// - Desktop (720-999px): 23% width (4 columns)
// - Wide (1000-1199px): 15.5% width (6 columns)
// - Ultra-wide (1200px+): 13.3% width (7 columns)
```

## Strategy Options

### Option A: Current (Max-Width with Centering)
✅ Pros: Professional, readable, standard practice
❌ Cons: Empty space on ultra-wide screens

### Option B: Full-Width Utilization
✅ Pros: No empty space, maximizes content
❌ Cons: Text becomes hard to read, UI can feel stretched

### Option C: Adaptive with Sidebars
✅ Pros: Best of both - uses space intelligently
❌ Cons: More complex to implement

## Recommended Approach

For most screens, use **Pattern 1 (Responsive Columns)** with the current max-width. This gives you:

1. **Mobile**: 2-3 columns, touch-friendly
2. **Tablet**: 3-4 columns, balanced
3. **Desktop**: 4-6 columns, utilizes space
4. **Ultra-wide**: 6-7 columns, maximizes content

For specific screens (like dashboards), use **Pattern 2 (Sidebar Layout)** to add contextual information on the side.

## Tips

1. **Test at different sizes**: Use browser DevTools to test 375px, 768px, 1024px, 1440px
2. **Use percentages, not pixels**: `width: "48%"` instead of `width: 200`
3. **Leverage flexbox**: `flexDirection`, `flexWrap`, `flex` are your friends
4. **Platform checks**: Use `Platform.OS === "web"` for web-specific features
5. **Breakpoint consistency**: Stick to the standard breakpoints (480, 640, 1024, 1440)

## Common Pitfalls

❌ **Don't**: Hardcode widths for all screen sizes
```tsx
<View style={{ width: 300 }} /> // Too wide on mobile, too narrow on desktop
```

✅ **Do**: Use responsive widths
```tsx
<View style={{ width: isMobile ? "90%" : "60%", maxWidth: 600 }} />
```

❌ **Don't**: Ignore touch targets on mobile
```tsx
<TouchableOpacity style={{ width: 20, height: 20 }} /> // Too small!
```

✅ **Do**: Make touch targets at least 44x44 on mobile
```tsx
<TouchableOpacity style={{ 
  width: isMobile ? 44 : 32,
  height: isMobile ? 44 : 32 
}} />
```

## Questions?

- Empty space bothering you? Increase `maxWidth` in `WebAppShell.styles.ts` (currently 1400px)
- Want more columns? Adjust breakpoints in `useProfileGridLayout.ts`
- Need sidebar layout? See Pattern 2 above
- Custom layout? Use `useResponsiveLayout()` and build your own logic
