import { FloatingQA } from '@/components/teaching/floating-qa';

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FloatingQA />
    </>
  );
}
