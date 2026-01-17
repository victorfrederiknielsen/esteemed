import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeaveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  isHost: boolean;
  nextHost: string | null;
  isAlone: boolean;
}

export function LeaveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isHost,
  nextHost,
  isAlone,
}: LeaveConfirmDialogProps) {
  const getDescription = () => {
    if (isHost && isAlone) {
      return "You are the last participant. Leaving will close the room.";
    }
    if (isHost && nextHost) {
      return `You are the host. Leaving will transfer ownership to ${nextHost}.`;
    }
    return "Are you sure you want to leave this room?";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave Room</AlertDialogTitle>
          <AlertDialogDescription>{getDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
