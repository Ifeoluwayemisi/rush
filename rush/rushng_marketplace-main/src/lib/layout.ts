// One responsive width, used everywhere a screen previously hardcoded
// `max-w-md` (phone-only). Applying the same token to <main>, TopBar,
// BottomNav, and every screen's own sticky/fixed inner bars means they
// all grow together — there's no separate "desktop version" to keep in
// sync, just one width that responds to the viewport.
//
// Mobile stays exactly as before (max-w-md). From there it grows through
// tablet and desktop breakpoints so wider screens actually get more
// content (see the grid column counts in Home/Shop/Explore/Search/Store),
// rather than a phone-width column floating in empty space.
export const CONTENT_WIDTH =
  "max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl";
