import { useMutation } from '@tanstack/react-query';
import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { toast } from 'sonner';

type ConfirmationDeleteDialogProps = {
 title: string;
 message: React.ReactNode;
 children: React.ReactNode;
 entityName: string;
 mutationFn: () => Promise<void>;
 onError?: (error: Error) => void;
 isDanger?: boolean;
};

export function ConfirmationDeleteDialog({
 children,
 message,
 title,
 mutationFn,
 entityName,
 onError,
 isDanger = false,
}: ConfirmationDeleteDialogProps) {
 const t = useTranslations('ConfirmationDeleteDialog');

 const [isOpen, setIsOpen] = useState(false);
 const { isPending, mutate } = useMutation({
   mutationFn,
   onError,
 });

 return (
   <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
     <DialogTrigger asChild>{children}</DialogTrigger>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>{title}</DialogTitle>
         <DialogDescription>{message}</DialogDescription>
       </DialogHeader>
       <DialogFooter>
         <Button
           variant={'outline'}
           onClick={(e) => {
             e.stopPropagation();
             e.preventDefault();
             setIsOpen(false);
           }}
         >
           {t('cancel')}
         </Button>
         <Button
           loading={isPending}
           variant={'destructive'}
           onClick={(e) => {
             e.stopPropagation();
             e.preventDefault();
             mutate();
           }}
         >
           {isDanger && <TriangleAlert className="size-4 mr-2" />}
           {t('remove')}
         </Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>
 );
}
