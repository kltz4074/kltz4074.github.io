import MarkdownIt from 'markdown-it';

const renderer = new MarkdownIt({ html: false, linkify: true });
const originalValidate = renderer.validateLink.bind(renderer);
renderer.validateLink = value => originalValidate(value) && !/^\s*(?:data:|\/\/|\\)/i.test(value);

export function markdown(value = '') {
  return renderer.render(value);
}
