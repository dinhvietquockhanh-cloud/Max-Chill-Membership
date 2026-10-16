import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallControl({ compact = false }: { compact?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const syncInstalledState = () => {
      const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
      setIsInstalled(standaloneMedia.matches || iosStandalone === true);
    };
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    syncInstalledState();
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    standaloneMedia.addEventListener('change', syncInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      standaloneMedia.removeEventListener('change', syncInstalledState);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch (error) {
      console.error('Không thể mở lời nhắc cài ứng dụng:', error);
      setShowInstructions(true);
    } finally {
      setInstallPrompt(null);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={installApp}
        aria-label="Cài ứng dụng Max Chill"
        title="Cài ứng dụng Max Chill"
        data-testid="button-install-app"
        className={
          compact
            ? 'flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 text-emerald-950 transition hover:bg-white/70'
            : 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-50/15 bg-amber-50/[.07] px-4 py-2.5 text-xs font-semibold text-amber-50/85 transition hover:bg-amber-50/[.13]'
        }
      >
        <Download size={16} />
        {!compact && <span>Cài ứng dụng</span>}
      </button>

      <AlertDialog open={showInstructions} onOpenChange={setShowInstructions}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cài Max Chill lên thiết bị</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                <strong>Android:</strong> mở trang bằng Chrome, nhấn menu ⋮ rồi chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.
              </span>
              <span className="block">
                <strong>Máy tính:</strong> mở bằng Chrome hoặc Edge, chọn biểu tượng cài đặt trên thanh địa chỉ hoặc tìm “Cài đặt ứng dụng” trong menu trình duyệt. Có thể tạo thêm lối tắt trên desktop sau khi cài.
              </span>
              <span className="block text-xs">
                Tính năng cài đặt cần trang HTTPS và trình duyệt hỗ trợ ứng dụng web.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
