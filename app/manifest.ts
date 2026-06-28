import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '자산궤도',
    short_name: '자산궤도',
    description: '2040년 15억 목표 궤도 추적 개인 웹앱',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#05070d',
    theme_color: '#05070d',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
