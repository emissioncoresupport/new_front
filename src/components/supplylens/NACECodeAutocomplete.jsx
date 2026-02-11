import React, { useState, useMemo } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Comprehensive NACE Rev. 2 codes
const NACE_CODES = [
  { code: "A01.1", description: "Growing of cereals, legumes and oil seeds" },
  { code: "A01.2", description: "Growing of perennial crops" },
  { code: "A01.3", description: "Plant propagation" },
  { code: "A01.4", description: "Animal production" },
  { code: "A01.5", description: "Mixed farming" },
  { code: "A02.1", description: "Forestry and logging" },
  { code: "A03.1", description: "Fishing" },
  { code: "A03.2", description: "Aquaculture" },
  { code: "B05", description: "Mining of coal and lignite" },
  { code: "B06", description: "Extraction of crude petroleum and natural gas" },
  { code: "B07", description: "Mining of metal ores" },
  { code: "B08", description: "Other mining and quarrying" },
  { code: "C10", description: "Manufacture of food products" },
  { code: "C11", description: "Manufacture of beverages" },
  { code: "C12", description: "Manufacture of tobacco products" },
  { code: "C13", description: "Manufacture of textiles" },
  { code: "C14", description: "Manufacture of wearing apparel" },
  { code: "C15", description: "Manufacture of leather and related products" },
  { code: "C16", description: "Manufacture of wood and products of wood" },
  { code: "C17", description: "Manufacture of paper and paper products" },
  { code: "C18", description: "Printing and reproduction of recorded media" },
  { code: "C19", description: "Manufacture of coke and refined petroleum products" },
  { code: "C20", description: "Manufacture of chemicals and chemical products" },
  { code: "C20.1", description: "Manufacture of basic chemicals, fertilizers" },
  { code: "C20.2", description: "Manufacture of pesticides and other agrochemical products" },
  { code: "C20.3", description: "Manufacture of paints, varnishes and similar coatings" },
  { code: "C20.4", description: "Manufacture of soap and detergents, cleaning preparations" },
  { code: "C20.5", description: "Manufacture of other chemical products" },
  { code: "C20.6", description: "Manufacture of man-made fibres" },
  { code: "C21", description: "Manufacture of pharmaceutical products" },
  { code: "C22", description: "Manufacture of rubber and plastic products" },
  { code: "C22.1", description: "Manufacture of rubber products" },
  { code: "C22.2", description: "Manufacture of plastics products" },
  { code: "C23", description: "Manufacture of other non-metallic mineral products" },
  { code: "C23.1", description: "Manufacture of glass and glass products" },
  { code: "C23.2", description: "Manufacture of refractory products" },
  { code: "C23.3", description: "Manufacture of clay building materials" },
  { code: "C23.4", description: "Manufacture of other porcelain and ceramic products" },
  { code: "C23.5", description: "Manufacture of cement, lime and plaster" },
  { code: "C23.6", description: "Manufacture of articles of concrete, cement and plaster" },
  { code: "C24", description: "Manufacture of basic metals" },
  { code: "C24.1", description: "Manufacture of basic iron and steel" },
  { code: "C24.2", description: "Manufacture of tubes, pipes, hollow profiles" },
  { code: "C24.3", description: "Manufacture of other products of first processing of steel" },
  { code: "C24.4", description: "Manufacture of basic precious and other non-ferrous metals" },
  { code: "C24.5", description: "Casting of metals" },
  { code: "C25", description: "Manufacture of fabricated metal products" },
  { code: "C25.1", description: "Manufacture of structural metal products" },
  { code: "C25.2", description: "Manufacture of tanks, reservoirs and containers of metal" },
  { code: "C25.3", description: "Manufacture of steam generators" },
  { code: "C25.4", description: "Manufacture of weapons and ammunition" },
  { code: "C25.5", description: "Forging, pressing, stamping and roll-forming of metal" },
  { code: "C25.6", description: "Treatment and coating of metals" },
  { code: "C25.7", description: "Manufacture of cutlery, tools and general hardware" },
  { code: "C25.9", description: "Manufacture of other fabricated metal products" },
  { code: "C26", description: "Manufacture of computer, electronic and optical products" },
  { code: "C26.1", description: "Manufacture of electronic components and boards" },
  { code: "C26.2", description: "Manufacture of computers and peripheral equipment" },
  { code: "C26.3", description: "Manufacture of communication equipment" },
  { code: "C26.4", description: "Manufacture of consumer electronics" },
  { code: "C26.5", description: "Manufacture of instruments for measuring, testing, navigation" },
  { code: "C26.6", description: "Manufacture of irradiation, electromedical equipment" },
  { code: "C26.7", description: "Manufacture of optical instruments and photographic equipment" },
  { code: "C26.8", description: "Manufacture of magnetic and optical media" },
  { code: "C27", description: "Manufacture of electrical equipment" },
  { code: "C28", description: "Manufacture of machinery and equipment n.e.c." },
  { code: "C29", description: "Manufacture of motor vehicles, trailers and semi-trailers" },
  { code: "C30", description: "Manufacture of other transport equipment" },
  { code: "C31", description: "Manufacture of furniture" },
  { code: "C32", description: "Other manufacturing" },
  { code: "C32.1", description: "Manufacture of jewellery, bijouterie and related articles" },
  { code: "C32.2", description: "Manufacture of musical instruments" },
  { code: "C32.3", description: "Manufacture of sports goods" },
  { code: "C32.4", description: "Manufacture of games and toys" },
  { code: "C32.5", description: "Manufacture of medical and dental instruments" },
  { code: "C32.9", description: "Manufacturing n.e.c." },
  { code: "C33", description: "Repair and installation of machinery and equipment" },
  { code: "D35", description: "Electricity, gas, steam and air conditioning supply" },
  { code: "E36", description: "Water collection, treatment and supply" },
  { code: "E37", description: "Sewerage" },
  { code: "E38", description: "Waste collection, treatment and disposal; materials recovery" },
  { code: "E39", description: "Remediation activities and other waste management" },
  { code: "F41", description: "Construction of buildings" },
  { code: "F42", description: "Civil engineering" },
  { code: "F43", description: "Specialised construction activities" },
  { code: "G45", description: "Wholesale/retail trade and repair of motor vehicles" },
  { code: "G46", description: "Wholesale trade, except of motor vehicles" },
  { code: "G46.1", description: "Wholesale on a fee or contract basis" },
  { code: "G46.2", description: "Wholesale of agricultural raw materials" },
  { code: "G46.3", description: "Wholesale of food, beverages and tobacco" },
  { code: "G46.4", description: "Wholesale of household goods" },
  { code: "G46.5", description: "Wholesale of information and communication equipment" },
  { code: "G46.6", description: "Wholesale of other machinery, equipment and supplies" },
  { code: "G46.7", description: "Other specialised wholesale" },
  { code: "G46.9", description: "Non-specialised wholesale trade" },
  { code: "G47", description: "Retail trade, except of motor vehicles" },
  { code: "H49", description: "Land transport and transport via pipelines" },
  { code: "H50", description: "Water transport" },
  { code: "H51", description: "Air transport" },
  { code: "H52", description: "Warehousing and support activities for transportation" },
  { code: "H53", description: "Postal and courier activities" },
  { code: "I55", description: "Accommodation" },
  { code: "I56", description: "Food and beverage service activities" },
  { code: "J58", description: "Publishing activities" },
  { code: "J59", description: "Motion picture, video, television programme production" },
  { code: "J60", description: "Programming and broadcasting activities" },
  { code: "J61", description: "Telecommunications" },
  { code: "J62", description: "Computer programming, consultancy" },
  { code: "J63", description: "Information service activities" },
  { code: "K64", description: "Financial service activities" },
  { code: "K65", description: "Insurance, reinsurance and pension funding" },
  { code: "K66", description: "Activities auxiliary to financial services and insurance" },
  { code: "L68", description: "Real estate activities" },
  { code: "M69", description: "Legal and accounting activities" },
  { code: "M70", description: "Activities of head offices; management consultancy" },
  { code: "M71", description: "Architectural and engineering activities; technical testing" },
  { code: "M72", description: "Scientific research and development" },
  { code: "M73", description: "Advertising and market research" },
  { code: "M74", description: "Other professional, scientific and technical activities" },
  { code: "M75", description: "Veterinary activities" },
  { code: "N77", description: "Rental and leasing activities" },
  { code: "N78", description: "Employment activities" },
  { code: "N79", description: "Travel agency, tour operator activities" },
  { code: "N80", description: "Security and investigation activities" },
  { code: "N81", description: "Services to buildings and landscape activities" },
  { code: "N82", description: "Office administrative, office support activities" },
  { code: "P85", description: "Education" },
  { code: "Q86", description: "Human health activities" },
  { code: "Q87", description: "Residential care activities" },
  { code: "Q88", description: "Social work activities without accommodation" },
  { code: "R90", description: "Creative, arts and entertainment activities" },
  { code: "R91", description: "Libraries, archives, museums and other cultural activities" },
  { code: "R92", description: "Gambling and betting activities" },
  { code: "R93", description: "Sports activities and amusement and recreation activities" },
  { code: "S94", description: "Activities of membership organisations" },
  { code: "S95", description: "Repair of computers and personal and household goods" },
  { code: "S96", description: "Other personal service activities" }
];

export default function NACECodeAutocomplete({ value, onChange, label = "NACE Code", required = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCodes = useMemo(() => {
    if (!search) return NACE_CODES;
    const query = search.toLowerCase();
    return NACE_CODES.filter(item => 
      item.code.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query)
    );
  }, [search]);

  const selectedItem = NACE_CODES.find(item => item.code === value);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedItem ? (
              <span className="truncate">
                <span className="font-medium">{selectedItem.code}</span>
                <span className="text-slate-500 ml-2 text-xs">• {selectedItem.description}</span>
              </span>
            ) : (
              <span className="text-slate-400">Search NACE code or industry...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search by code or industry..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No NACE code found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredCodes.map((item) => (
                  <CommandItem
                    key={item.code}
                    value={item.code}
                    onSelect={() => {
                      onChange(item.code);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{item.code}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}