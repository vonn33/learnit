import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadDropzone } from '@/components/import/UploadDropzone';

describe('UploadDropzone', () => {
  it('calls onFiles when file dropped', () => {
    const onFiles = vi.fn();
    render(<UploadDropzone onFiles={onFiles} />);
    const dropzone = screen.getByTestId('upload-dropzone');
    const file = new File(['# hi'], 'a.md', { type: 'text/markdown' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('calls onFiles when picker selects file', () => {
    const onFiles = vi.fn();
    render(<UploadDropzone onFiles={onFiles} />);
    const input = screen.getByTestId('upload-input');
    const file = new File(['# hi'], 'a.md', { type: 'text/markdown' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('rejects non-md files', () => {
    const onFiles = vi.fn();
    render(<UploadDropzone onFiles={onFiles} />);
    const dropzone = screen.getByTestId('upload-dropzone');
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(onFiles).not.toHaveBeenCalled();
  });
});
