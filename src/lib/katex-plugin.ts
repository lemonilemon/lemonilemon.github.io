// Renders the math nodes Sätteri emits (`code.language-math`, inline or inside
// a `pre` for display math) to KaTeX HTML at build time.
import katex from 'katex';
import { defineHastPlugin } from 'satteri';

export const katexPlugin = defineHastPlugin({
  name: 'katex',
  element: {
    filter: ['code'],
    visit(node, ctx) {
      const classes = node.properties.className;
      if (!Array.isArray(classes) || !classes.includes('language-math')) return;
      const display = classes.includes('math-display');
      const html = katex.renderToString(ctx.textContent(node), { displayMode: display, throwOnError: false, output: 'htmlAndMathml' });
      const parent = ctx.parent(node);
      const target = display && parent.type === 'element' && parent.tagName === 'pre' ? parent : node;
      ctx.replaceNode(target, { type: 'raw', value: html });
    },
  },
});
