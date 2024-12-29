import { SearchIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';


type DataTableInputPopoverProps = {
  title?: string;
  filterValue: string;
  handleFilterChange: (filterValue: string) => void;
};

const DataTableInputPopover = ({
  title,
  filterValue,
  handleFilterChange,
}: DataTableInputPopoverProps) => {
  const [searchQuery, setSearchQuery] = useState(filterValue);
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  useEffect(() => {
    handleFilterChange(debouncedQuery);
  }, [debouncedQuery]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <SearchIcon className="mr-2 size-4" />
          {title}
          {filterValue.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal max-w-40 truncate"
              >
                {filterValue}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Input
          type="text"
          placeholder="Name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </PopoverContent>
    </Popover>
  );
};

export { DataTableInputPopover };
