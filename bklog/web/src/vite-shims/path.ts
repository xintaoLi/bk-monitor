/* Browser-safe path shim for legacy UMD packages imported by Vite. */

const sep = '/';
const delimiter = ':';

const normalizeArray = (parts: string[], allowAboveRoot: boolean) => {
  const res: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      if (res.length && res[res.length - 1] !== '..') {
        res.pop();
      } else if (allowAboveRoot) {
        res.push('..');
      }
    } else {
      res.push(part);
    }
  }
  return res;
};

const normalize = (inputPath = '') => {
  const isAbsolute = inputPath.charAt(0) === '/';
  const trailingSlash = inputPath.endsWith('/');
  const normalized = normalizeArray(inputPath.split('/'), !isAbsolute).join('/');
  if (!normalized && !isAbsolute) {
    return trailingSlash ? './' : '.';
  }
  return (isAbsolute ? '/' : '') + normalized + (trailingSlash ? '/' : '');
};

const join = (...paths: string[]) => normalize(paths.filter(Boolean).join('/'));

const dirname = (inputPath = '') => {
  if (!inputPath) return '.';
  const hasRoot = inputPath.charAt(0) === '/';
  let end = -1;
  for (let i = inputPath.length - 1; i >= 1; i--) {
    if (inputPath.charAt(i) === '/') {
      end = i;
      break;
    }
  }
  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) return '/';
  return inputPath.slice(0, end);
};

const basename = (inputPath = '', ext = '') => {
  const base = inputPath.split('/').filter(Boolean).pop() || '';
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
};

const extname = (inputPath = '') => {
  const base = basename(inputPath);
  const index = base.lastIndexOf('.');
  return index > 0 ? base.slice(index) : '';
};

const resolve = (...paths: string[]) => normalize('/' + paths.filter(Boolean).join('/'));

const pathShim = {
  sep,
  delimiter,
  normalize,
  join,
  dirname,
  basename,
  extname,
  resolve,
  posix: undefined as any,
  win32: undefined as any,
};

pathShim.posix = pathShim;
pathShim.win32 = pathShim;

export { basename, delimiter, dirname, extname, join, normalize, resolve, sep };
export default pathShim;
