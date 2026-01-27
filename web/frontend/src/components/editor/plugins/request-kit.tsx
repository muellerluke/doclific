import { createPlatePlugin } from "platejs/react";
import { HttpRequestElement } from "@/components/ui/request-node";

export const HttpRequestType = 'HttpRequest';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey';

export interface KeyValuePair {
    key: string;
    value: string;
    enabled: boolean;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';

export interface HttpAuth {
    type: AuthType;
    // Basic auth
    username?: string;
    password?: string;
    // Bearer token
    token?: string;
    // API Key
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyLocation?: 'header' | 'query';
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number; // ms
    size: number; // bytes
    cookies: string[];
}

export interface HttpRequestElementType {
    type: typeof HttpRequestType;
    method: HttpMethod;
    url: string;
    headers: KeyValuePair[];
    queryParams: KeyValuePair[];
    bodyType: BodyType;
    bodyContent: string;
    formData: KeyValuePair[];
    auth: HttpAuth;
    response?: HttpResponse;
    children: [{ text: '' }];
    [key: string]: any;
}

export const HttpRequestPlugin = createPlatePlugin({
    key: HttpRequestType,
    node: {
        isElement: true,
        isVoid: true,
        component: HttpRequestElement
    }
});
