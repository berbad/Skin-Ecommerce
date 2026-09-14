import { render, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import AddProductForm from './AddProductForm';
vi.mock('@/lib/axios', () => ({default:{post:vi.fn()}}));
test('does not preview or submit active SVG/HTML uploads', () => {
 const create = vi.fn(() => 'blob:test');
 vi.stubGlobal('URL', Object.assign(URL, {createObjectURL:create,revokeObjectURL:vi.fn()}));
 vi.spyOn(window, 'alert').mockImplementation(()=>{});
 const {container} = render(<AddProductForm onProductAdded={()=>{}}/>);
 const input=container.querySelector('input[type=file]')!;
 fireEvent.change(input,{target:{files:[new File(['<svg onload="alert(1)"/>'],'attack.svg',{type:'image/svg+xml'})]}});
 expect(create).not.toHaveBeenCalled();
 expect(container.querySelector('img[alt=Preview]')).toBeNull();
 vi.restoreAllMocks();
});

test('renders uploaded raster pixels without creating a navigable blob URL', async () => {
 const bitmap={width:2,height:3,close:vi.fn()};
 const createBitmap=vi.fn(async()=>bitmap);
 vi.stubGlobal('createImageBitmap',createBitmap);
 const drawImage=vi.fn();
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D);
 const {container,unmount}=render(<AddProductForm onProductAdded={()=>{}}/>);
 const file=new File(['png'],'photo.png',{type:'image/png'});
 fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[file]}});
 await vi.waitFor(()=>expect(drawImage).toHaveBeenCalledWith(bitmap,0,0));
 expect(container.querySelector('canvas')).not.toBeNull();
 unmount();
 expect(bitmap.close).toHaveBeenCalled();
 vi.restoreAllMocks();
});
