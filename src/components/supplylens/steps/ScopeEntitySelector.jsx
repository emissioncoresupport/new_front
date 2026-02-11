import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Entity selector for scope target binding
 * Searches and binds to real tenant entities (LegalEntity, Site, Product)
 */
export default function ScopeEntitySelector({ entityType, value, onChange, placeholder, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch entities from tenant
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['scope-entities', entityType],
    queryFn: async () => {
      try {
        const entityMap = {
          'LegalEntity': 'Company',
          'Site': 'Site',
          'Product': 'Product'
        };
        const targetEntity = entityMap[entityType] || entityType;
        const records = await base44.entities[targetEntity].list();
        return records || [];
      } catch (e) {
        console.error(`Failed to load ${entityType}:`, e);
        return [];
      }
    },
    staleTime: 30000
  });

  const getEntityLabel = (entity) => {
    if (entityType === 'LegalEntity') return entity.legal_name || entity.name || entity.id;
    if (entityType === 'Site') return entity.site_name || entity.name || entity.id;
    if (entityType === 'Product') return entity.name || entity.product_name || entity.id;
    return entity.name || entity.id;
  };

  const getEntityId = (entity) => {
    if (entityType === 'LegalEntity') return entity.company_id || entity.id;
    if (entityType === 'Site') return entity.site_id || entity.id;
    if (entityType === 'Product') return entity.product_id || entity.id;
    return entity.id;
  };

  const filteredEntities = entities.filter(e => 
    getEntityLabel(e).toLowerCase().includes(search.toLowerCase())
  );

  const selectedEntity = entities.find(e => getEntityId(e) === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-red-400",
            !value && "text-muted-foreground"
          )}
        >
          {value && selectedEntity ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#86b027]" />
              {getEntityLabel(selectedEntity)}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={`Search ${entityType.toLowerCase()}s...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : `No ${entityType.toLowerCase()}s found.`}
            </CommandEmpty>
            <CommandGroup>
              {filteredEntities.map((entity) => {
                const entityId = getEntityId(entity);
                const label = getEntityLabel(entity);
                return (
                  <CommandItem
                    key={entityId}
                    value={label}
                    onSelect={() => {
                      onChange(entityId, label);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === entityId ? "opacity-100 text-[#86b027]" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-slate-500">{entityId}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}