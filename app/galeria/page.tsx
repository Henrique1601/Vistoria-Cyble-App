import { Metadata } from 'next';
import GaleriaClient from './GaleriaClient';

export const metadata: Metadata = {
  title: 'Galeria de Leituras',
  description: 'Fotos das leituras de vistoria Cyble',
};

export default function GaleriaPage() {
  return <GaleriaClient />;
}
