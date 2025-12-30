import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerService } from '../../services/customer.service';

interface Message {
    text: string;
    isUser: boolean;
    timestamp: Date;
}

@Component({
    selector: 'app-ask-agent',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ask-agent.component.html',
    styleUrls: ['./ask-agent.component.css']
})
export class AskAgentComponent {
    private customerService = inject(CustomerService);
    messages = signal<Message[]>([
        { text: 'Hello! How can I help you today?', isUser: false, timestamp: new Date() }
    ]);
    isLoading = signal<boolean>(false);

    sendMessage(text: string) {
        if (!text.trim() || this.isLoading()) return;

        // Add user message immediately
        const userMsg: Message = {
            text: text,
            isUser: true,
            timestamp: new Date()
        };

        this.messages.update(msgs => [...msgs, userMsg]);
        this.isLoading.set(true);

        // Append instruction to get text format instead of JSON
        const promptWithInstruction = `${text}. Please provide the response in a readable text format with creating the list or table format. Do not return raw JSON.`;

        this.customerService.askAgent(promptWithInstruction).subscribe({
            next: (response) => {
                const agentMsg: Message = {
                    text: response.answer,
                    isUser: false,
                    timestamp: new Date(response.timestamp)
                };
                this.messages.update(msgs => [...msgs, agentMsg]);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('AskAgent Error:', err);
                const errorMsg: Message = {
                    text: 'Sorry, I encountered an error while processing your request. Please try again.',
                    isUser: false,
                    timestamp: new Date()
                };
                this.messages.update(msgs => [...msgs, errorMsg]);
                this.isLoading.set(false);
            }
        });
    }
}
