// Prints one line for every API request: time, method, address, result and how long it took.
// (It never prints passwords or request bodies.)
module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const url = req.originalUrl.split('?')[0];
    if (!url.startsWith('/api')) return;
    const time = new Date().toLocaleTimeString();
    console.log(`${time}  ${req.method.padEnd(6)} ${url}  ->  ${res.statusCode}  (${Date.now() - start} ms)`);
  });
  next();
};