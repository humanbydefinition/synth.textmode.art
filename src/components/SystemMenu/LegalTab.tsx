import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function LegalTab() {
    return (
        <ScrollArea className="h-full">
            <div className="p-6">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="imprint" className="border-white/5">
                        <AccordionTrigger className="text-sm text-zinc-300 hover:text-white">Imprint</AccordionTrigger>
                        <AccordionContent className="text-sm text-zinc-400 leading-relaxed">
                            <div className="space-y-4 p-2">
                                <p>
                                    <strong>Contact Information</strong><br />
                                    humanbydefinition<br />
                                    [Street Address Placeholder]<br />
                                    [City, Zip Placeholder]<br />
                                    Germany
                                </p>
                                <p>
                                    <strong>Email:</strong> contact@example.com<br />
                                    <strong>Phone:</strong> +49 000 000000
                                </p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="privacy" className="border-white/5">
                        <AccordionTrigger className="text-sm text-zinc-300 hover:text-white">Data Protection Policy</AccordionTrigger>
                        <AccordionContent className="text-sm text-zinc-400 leading-relaxed">
                            <div className="space-y-4 p-2">
                                <h4 className="font-medium text-zinc-200">1. Data Collection</h4>
                                <p>
                                    This website does not collect personal data. All code and settings are stored locally in your browser's LocalStorage.
                                </p>
                                <h4 className="font-medium text-zinc-200">2. Cookies</h4>
                                <p>
                                    We do not use tracking cookies. Technical storage is used solely for saving your work state.
                                </p>
                                <h4 className="font-medium text-zinc-200">3. Third Party Services</h4>
                                <p>
                                    This site is hosted on [Provider]. No external analytics services are used.
                                </p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </ScrollArea>
    );
}
