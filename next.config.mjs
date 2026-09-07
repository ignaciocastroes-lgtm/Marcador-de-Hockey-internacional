/** @type {import('next').NextConfig} */
const nextConfig = {
  // `typescript.ignoreBuildErrors` estuvo en `true` durante toda la 3.x, y
  // tapaba dos errores reales que ya fueron corregidos. Con la red de
  // seguridad puesta, un error de tipos vuelve a romper el build en vez de
  // llegar callado a la cancha — que es exactamente para lo que sirve.
  //
  // Si un build falla acá, el arreglo es corregir el tipo, nunca volver a
  // poner esta bandera.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
