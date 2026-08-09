import { useEffect } from 'react';

export function useRightClickScroll() {
  useEffect(() => {
    let isDown = false;
    let startY: number;
    let startX: number;
    let scrollTop: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return; // Only right click
      isDown = true;
      document.body.classList.add('cursor-grabbing');
      startY = e.clientY;
      startX = e.clientX;
      scrollTop = window.scrollY;
      scrollLeft = window.scrollX;
    };

    const handleMouseLeave = () => {
      isDown = false;
      document.body.classList.remove('cursor-grabbing');
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      isDown = false;
      document.body.classList.remove('cursor-grabbing');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      
      const y = e.clientY;
      const x = e.clientX;
      
      const walkY = (y - startY) * 1.5; // Scroll speed multiplier
      const walkX = (x - startX) * 1.5;
      
      window.scrollTo(scrollLeft - walkX, scrollTop - walkY);
    };
    
    // Prevent default context menu to make dragging smooth
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);
}
