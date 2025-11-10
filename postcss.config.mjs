const config = {
  // Tailwind v4 moved the PostCSS plugin to a separate package.
  // Use the scoped plugin package so PostCSS loads Tailwind correctly.
  plugins: ["@tailwindcss/postcss", "autoprefixer"],
};

export default config;
