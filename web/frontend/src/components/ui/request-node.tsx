import type { PlateElementProps } from 'platejs/react';
import type {
    HttpRequestElementType,
    HttpMethod,
    KeyValuePair,
    BodyType,
    AuthType,
    HttpResponse,
    HttpAuth
} from '@/components/editor/plugins/request-kit';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTheme } from '@/components/theme-provider';
import { createHighlighter, type Highlighter } from 'shiki';
import {
    Play,
    Plus,
    Trash2,
    Copy,
    ChevronDown,
    ChevronRight,
    Eye,
    FileText,
    Code2,
    Cookie,
    Key,
    Globe,
    Clock,
    Database,
    Check,
} from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { toast } from 'sonner';
import { Spinner } from './spinner';
import { Button } from './button';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from './select';
import { cn } from '@/lib/utils';

// Singleton highlighter cache
let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();

async function getHighlighter(lang: string): Promise<Highlighter> {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: [lang, 'text', 'json', 'xml', 'html'],
        });
        loadedLangs.add(lang);
        loadedLangs.add('text');
        loadedLangs.add('json');
        loadedLangs.add('xml');
        loadedLangs.add('html');
    }

    const highlighter = await highlighterPromise;

    if (!loadedLangs.has(lang)) {
        try {
            await highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]);
            loadedLangs.add(lang);
        } catch {
            // Fallback to text if language not supported
        }
    }

    return highlighter;
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<HttpMethod, string> = {
    GET: 'text-green-500',
    POST: 'text-blue-500',
    PUT: 'text-orange-500',
    DELETE: 'text-red-500',
    PATCH: 'text-purple-500',
    HEAD: 'text-gray-500',
    OPTIONS: 'text-cyan-500',
};

type RequestTab = 'params' | 'headers' | 'body' | 'auth';
type ResponseTab = 'body' | 'headers' | 'cookies';
type BodyViewTab = 'pretty' | 'raw' | 'preview';

// Key-Value Table Component
function KeyValueTable({
    items,
    onChange,
    placeholder = { key: 'Key', value: 'Value' }
}: {
    items: KeyValuePair[];
    onChange: (items: KeyValuePair[]) => void;
    placeholder?: { key: string; value: string };
}) {
    const addRow = () => {
        onChange([...items, { key: '', value: '', enabled: true }]);
    };

    const updateRow = (index: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: val };
        onChange(newItems);
    };

    const removeRow = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium">
                <div className="w-5"></div>
                <div>{placeholder.key}</div>
                <div>{placeholder.value}</div>
                <div className="w-8"></div>
            </div>
            {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                    <Checkbox
                        checked={item.enabled}
                        onCheckedChange={(checked) => updateRow(index, 'enabled', !!checked)}
                    />
                    <Input
                        value={item.key}
                        onChange={(e) => updateRow(index, 'key', e.target.value)}
                        placeholder={placeholder.key}
                        className="h-8 text-sm"
                    />
                    <Input
                        value={item.value}
                        onChange={(e) => updateRow(index, 'value', e.target.value)}
                        placeholder={placeholder.value}
                        className="h-8 text-sm"
                    />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                variant="ghost"
                size="sm"
                onClick={addRow}
                className="text-muted-foreground"
            >
                <Plus className="h-4 w-4 mr-1" />
                Add
            </Button>
        </div>
    );
}

// Tab Button Component
function TabButton({
    active,
    onClick,
    children,
    count
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    count?: number;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors",
                active
                    ? "bg-background text-foreground border border-b-0 border-border"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                    {count}
                </span>
            )}
        </button>
    );
}

// Auth Section Component
function AuthSection({
    auth,
    onChange
}: {
    auth: HttpAuth;
    onChange: (auth: HttpAuth) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Type:</span>
                <Select
                    value={auth.type}
                    onValueChange={(value: AuthType) => onChange({ ...auth, type: value })}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Auth</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="apikey">API Key</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {auth.type === 'basic' && (
                <div className="space-y-3 pl-4 border-l-2 border-border">
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Username:</label>
                        <Input
                            value={auth.username || ''}
                            onChange={(e) => onChange({ ...auth, username: e.target.value })}
                            placeholder="Username"
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Password:</label>
                        <Input
                            type="password"
                            value={auth.password || ''}
                            onChange={(e) => onChange({ ...auth, password: e.target.value })}
                            placeholder="Password"
                            className="flex-1"
                        />
                    </div>
                </div>
            )}

            {auth.type === 'bearer' && (
                <div className="space-y-3 pl-4 border-l-2 border-border">
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Token:</label>
                        <Input
                            value={auth.token || ''}
                            onChange={(e) => onChange({ ...auth, token: e.target.value })}
                            placeholder="Enter bearer token"
                            className="flex-1"
                        />
                    </div>
                </div>
            )}

            {auth.type === 'apikey' && (
                <div className="space-y-3 pl-4 border-l-2 border-border">
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Key Name:</label>
                        <Input
                            value={auth.apiKeyName || ''}
                            onChange={(e) => onChange({ ...auth, apiKeyName: e.target.value })}
                            placeholder="e.g., X-API-Key"
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Value:</label>
                        <Input
                            value={auth.apiKeyValue || ''}
                            onChange={(e) => onChange({ ...auth, apiKeyValue: e.target.value })}
                            placeholder="API key value"
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm w-20">Add to:</label>
                        <Select
                            value={auth.apiKeyLocation || 'header'}
                            onValueChange={(value: 'header' | 'query') => onChange({ ...auth, apiKeyLocation: value })}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="query">Query Param</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
        </div>
    );
}

// Body Editor Component
function BodyEditor({
    bodyType,
    bodyContent,
    formData,
    onBodyTypeChange,
    onBodyContentChange,
    onFormDataChange
}: {
    bodyType: BodyType;
    bodyContent: string;
    formData: KeyValuePair[];
    onBodyTypeChange: (type: BodyType) => void;
    onBodyContentChange: (content: string) => void;
    onFormDataChange: (data: KeyValuePair[]) => void;
}) {
    const formatJson = () => {
        try {
            const parsed = JSON.parse(bodyContent);
            onBodyContentChange(JSON.stringify(parsed, null, 2));
        } catch {
            toast.error('Invalid JSON');
        }
    };

    const bodyTypeLabels: Record<BodyType, string> = {
        'none': 'none',
        'json': 'JSON',
        'form-data': 'form-data',
        'x-www-form-urlencoded': 'x-www-form-urlencoded',
        'raw': 'raw'
    };

    return (
        <div className="space-y-3">
            <RadioGroup
                value={bodyType}
                onValueChange={(value) => onBodyTypeChange(value as BodyType)}
                className="flex flex-row items-center gap-4"
            >
                {(['none', 'json', 'form-data', 'x-www-form-urlencoded', 'raw'] as BodyType[]).map((type) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <RadioGroupItem value={type} id={`body-type-${type}`} />
                        <Label
                            htmlFor={`body-type-${type}`}
                            className={cn(
                                "text-sm cursor-pointer",
                                bodyType === type ? 'text-foreground' : 'text-muted-foreground'
                            )}
                        >
                            {bodyTypeLabels[type]}
                        </Label>
                    </div>
                ))}
            </RadioGroup>

            {bodyType === 'none' && (
                <p className="text-sm text-muted-foreground italic">This request does not have a body</p>
            )}

            {bodyType === 'json' && (
                <div className="space-y-2">
                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={formatJson}>
                            <Code2 className="h-4 w-4 mr-1" />
                            Format
                        </Button>
                    </div>
                    <textarea
                        value={bodyContent}
                        onChange={(e) => onBodyContentChange(e.target.value)}
                        placeholder='{"key": "value"}'
                        className="w-full h-40 p-3 text-sm font-mono bg-muted rounded-md border border-input resize-y"
                    />
                </div>
            )}

            {bodyType === 'raw' && (
                <textarea
                    value={bodyContent}
                    onChange={(e) => onBodyContentChange(e.target.value)}
                    placeholder="Raw request body"
                    className="w-full h-40 p-3 text-sm font-mono bg-muted rounded-md border border-input resize-y"
                />
            )}

            {(bodyType === 'form-data' || bodyType === 'x-www-form-urlencoded') && (
                <KeyValueTable
                    items={formData}
                    onChange={onFormDataChange}
                    placeholder={{ key: 'Field', value: 'Value' }}
                />
            )}
        </div>
    );
}

// Response Viewer Component
function ResponseViewer({
    response,
    onDelete
}: {
    response: HttpResponse;
    onDelete: () => void;
}) {
    const { theme } = useTheme();
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
    const [highlightedBody, setHighlightedBody] = useState<string>('');
    const [responseTab, setResponseTab] = useState<ResponseTab>('body');
    const [bodyViewTab, setBodyViewTab] = useState<BodyViewTab>('pretty');
    const [isExpanded, setIsExpanded] = useState(true);

    // Detect content type
    const contentType = response.headers['content-type'] || response.headers['Content-Type'] || '';
    const isJson = contentType.includes('application/json');
    const isXml = contentType.includes('application/xml') || contentType.includes('text/xml');
    const isHtml = contentType.includes('text/html');
    const isImage = contentType.startsWith('image/');
    const isPdf = contentType.includes('application/pdf');

    const detectedLang = isJson ? 'json' : isXml ? 'xml' : isHtml ? 'html' : 'text';

    useEffect(() => {
        getHighlighter(detectedLang).then(setHighlighter).catch(console.error);
    }, [detectedLang]);

    useEffect(() => {
        if (!highlighter || !response.body) return;

        const highlight = async () => {
            let bodyToHighlight = response.body;

            // Try to format JSON
            if (isJson) {
                try {
                    bodyToHighlight = JSON.stringify(JSON.parse(response.body), null, 2);
                } catch {
                    // Keep original if parsing fails
                }
            }

            try {
                const html = highlighter.codeToHtml(bodyToHighlight, {
                    lang: detectedLang,
                    theme: theme === 'dark' ? 'github-dark' : 'github-light',
                });
                setHighlightedBody(html);
            } catch {
                setHighlightedBody(`<pre>${response.body}</pre>`);
            }
        };

        highlight();
    }, [highlighter, response.body, detectedLang, theme, isJson]);

    const statusColor = response.status >= 200 && response.status < 300
        ? 'text-green-500'
        : response.status >= 400
            ? 'text-red-500'
            : 'text-yellow-500';

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(response.body);
        toast.success('Response copied to clipboard');
    };

    return (
        <div className="border-t border-border">
            <div className="px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-4 flex-1"
                >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm font-medium">Response</span>
                    <span className={cn("text-sm font-bold", statusColor)}>
                        {response.status} {response.statusText}
                    </span>
                </button>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {response.time}ms
                    </span>
                    <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {formatSize(response.size)}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onDelete}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        title="Delete response"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-1 border-b border-border mb-3">
                        <TabButton
                            active={responseTab === 'body'}
                            onClick={() => setResponseTab('body')}
                        >
                            <FileText className="h-3.5 w-3.5 inline mr-1" />
                            Body
                        </TabButton>
                        <TabButton
                            active={responseTab === 'headers'}
                            onClick={() => setResponseTab('headers')}
                            count={Object.keys(response.headers).length}
                        >
                            Headers
                        </TabButton>
                        <TabButton
                            active={responseTab === 'cookies'}
                            onClick={() => setResponseTab('cookies')}
                            count={response.cookies.length}
                        >
                            <Cookie className="h-3.5 w-3.5 inline mr-1" />
                            Cookies
                        </TabButton>
                    </div>

                    {responseTab === 'body' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    <TabButton
                                        active={bodyViewTab === 'pretty'}
                                        onClick={() => setBodyViewTab('pretty')}
                                    >
                                        Pretty
                                    </TabButton>
                                    <TabButton
                                        active={bodyViewTab === 'raw'}
                                        onClick={() => setBodyViewTab('raw')}
                                    >
                                        Raw
                                    </TabButton>
                                    {(isImage || isPdf || isHtml) && (
                                        <TabButton
                                            active={bodyViewTab === 'preview'}
                                            onClick={() => setBodyViewTab('preview')}
                                        >
                                            <Eye className="h-3.5 w-3.5 inline mr-1" />
                                            Preview
                                        </TabButton>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="bg-muted rounded-md overflow-hidden max-h-96 overflow-y-auto">
                                {bodyViewTab === 'pretty' && (
                                    <div
                                        className="p-4 text-sm font-mono [&_pre]:m-0 [&_pre]:bg-transparent"
                                        dangerouslySetInnerHTML={{ __html: highlightedBody }}
                                    />
                                )}
                                {bodyViewTab === 'raw' && (
                                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
                                        {response.body}
                                    </pre>
                                )}
                                {bodyViewTab === 'preview' && (
                                    <div className="p-4">
                                        {isImage && (
                                            <img
                                                src={`data:${contentType};base64,${response.body}`}
                                                alt="Response preview"
                                                className="max-w-full"
                                            />
                                        )}
                                        {isHtml && (
                                            <iframe
                                                srcDoc={response.body}
                                                className="w-full h-64 bg-white rounded"
                                                sandbox="allow-same-origin"
                                            />
                                        )}
                                        {isPdf && (
                                            <p className="text-muted-foreground text-sm">PDF preview not available</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {responseTab === 'headers' && (
                        <div className="bg-muted rounded-md p-4 max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                    {Object.entries(response.headers).map(([key, value]) => (
                                        <tr key={key} className="border-b border-border/50 last:border-0">
                                            <td className="py-1.5 pr-4 font-medium text-muted-foreground">{key}</td>
                                            <td className="py-1.5 font-mono text-xs break-all">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {responseTab === 'cookies' && (
                        <div className="bg-muted rounded-md p-4 max-h-64 overflow-y-auto">
                            {response.cookies.length > 0 ? (
                                <div className="space-y-2">
                                    {response.cookies.map((cookie, index) => (
                                        <div key={index} className="text-sm font-mono break-all p-2 bg-background rounded">
                                            {cookie}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No cookies in response</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Main Component
export function HttpRequestElement({
    attributes,
    children,
    element
}: PlateElementProps<HttpRequestElementType>) {
    const editor = useEditorRef();
    const [requestTab, setRequestTab] = useState<RequestTab>('params');
    const [isLoading, setIsLoading] = useState(false);

    const updateElement = useCallback((updates: Partial<HttpRequestElementType>) => {
        editor.tf.setNodes(updates, { at: element });
    }, [editor, element]);

    const buildUrl = useMemo(() => {
        let url = element.url || '';
        const enabledParams = element.queryParams?.filter(p => p.enabled && p.key) || [];

        if (enabledParams.length > 0) {
            const queryString = enabledParams
                .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                .join('&');
            url += (url.includes('?') ? '&' : '?') + queryString;
        }

        return url;
    }, [element.url, element.queryParams]);

    const sendRequest = async () => {
        if (!element.url) {
            toast.error('Please enter a URL');
            return;
        }

        setIsLoading(true);
        const startTime = performance.now();

        try {
            // Build headers
            const headers: Record<string, string> = {};
            element.headers?.forEach(h => {
                if (h.enabled && h.key) {
                    headers[h.key] = h.value;
                }
            });

            // Add auth headers
            if (element.auth?.type === 'basic' && element.auth.username) {
                const credentials = btoa(`${element.auth.username}:${element.auth.password || ''}`);
                headers['Authorization'] = `Basic ${credentials}`;
            } else if (element.auth?.type === 'bearer' && element.auth.token) {
                headers['Authorization'] = `Bearer ${element.auth.token}`;
            } else if (element.auth?.type === 'apikey' && element.auth.apiKeyName && element.auth.apiKeyValue) {
                if (element.auth.apiKeyLocation === 'header') {
                    headers[element.auth.apiKeyName] = element.auth.apiKeyValue;
                }
            }

            // Build body
            let body: string | FormData | undefined;
            if (element.method !== 'GET' && element.method !== 'HEAD') {
                if (element.bodyType === 'json') {
                    headers['Content-Type'] = 'application/json';
                    body = element.bodyContent;
                } else if (element.bodyType === 'raw') {
                    body = element.bodyContent;
                } else if (element.bodyType === 'x-www-form-urlencoded') {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    const params = new URLSearchParams();
                    element.formData?.forEach(f => {
                        if (f.enabled && f.key) {
                            params.append(f.key, f.value);
                        }
                    });
                    body = params.toString();
                } else if (element.bodyType === 'form-data') {
                    const formData = new FormData();
                    element.formData?.forEach(f => {
                        if (f.enabled && f.key) {
                            formData.append(f.key, f.value);
                        }
                    });
                    body = formData;
                }
            }

            // Build URL with query params (including API key if needed)
            let requestUrl = buildUrl;
            if (element.auth?.type === 'apikey' && element.auth.apiKeyLocation === 'query' && element.auth.apiKeyName && element.auth.apiKeyValue) {
                requestUrl += (requestUrl.includes('?') ? '&' : '?') +
                    `${encodeURIComponent(element.auth.apiKeyName)}=${encodeURIComponent(element.auth.apiKeyValue)}`;
            }

            const response = await fetch(requestUrl, {
                method: element.method,
                headers,
                body: body instanceof FormData ? body : body,
            });

            const endTime = performance.now();
            const responseText = await response.text();

            // Extract response headers
            const responseHeaders: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            // Extract cookies
            const cookies = responseHeaders['set-cookie']
                ? [responseHeaders['set-cookie']]
                : [];

            const httpResponse: HttpResponse = {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                body: responseText,
                time: Math.round(endTime - startTime),
                size: new Blob([responseText]).size,
                cookies,
            };

            updateElement({ response: httpResponse });

            if (response.ok) {
                toast.success(`Request completed: ${response.status} ${response.statusText}`);
            } else {
                toast.error(`Request failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            const endTime = performance.now();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            const httpResponse: HttpResponse = {
                status: 0,
                statusText: 'Error',
                headers: {},
                body: errorMessage,
                time: Math.round(endTime - startTime),
                size: 0,
                cookies: [],
            };

            updateElement({ response: httpResponse });
            toast.error(`Request failed: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const enabledParamsCount = element.queryParams?.filter(p => p.enabled && p.key).length || 0;
    const enabledHeadersCount = element.headers?.filter(h => h.enabled && h.key).length || 0;

    return (
        <div
            contentEditable={false}
            {...attributes}
            className="http-request my-4 rounded-lg border overflow-hidden"
        >
            {/* Request URL Bar */}
            <div className="bg-muted px-4 py-3 border-b flex items-center gap-3">
                <Select
                    value={element.method}
                    onValueChange={(value: HttpMethod) => updateElement({ method: value })}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue>
                            <span className={cn("font-bold", METHOD_COLORS[element.method])}>
                                {element.method}
                            </span>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {HTTP_METHODS.map(method => (
                            <SelectItem key={method} value={method}>
                                <span className={cn("font-bold", METHOD_COLORS[method])}>
                                    {method}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1 relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={element.url || ''}
                        onChange={(e) => updateElement({ url: e.target.value })}
                        placeholder="https://api.example.com/endpoint"
                        className="pl-9 font-mono text-sm"
                    />
                </div>

                <Button
                    onClick={sendRequest}
                    disabled={isLoading}
                    className="min-w-24"
                >
                    {isLoading ? (
                        <Spinner className="h-4 w-4" />
                    ) : (
                        <>
                            <Play className="h-4 w-4 mr-1" />
                            Send
                        </>
                    )}
                </Button>
            </div>

            {/* Request Configuration Tabs */}
            <div className="px-4 pt-2">
                <div className="flex items-center gap-1 border-b border-border">
                    <TabButton
                        active={requestTab === 'params'}
                        onClick={() => setRequestTab('params')}
                        count={enabledParamsCount}
                    >
                        Query Params
                    </TabButton>
                    <TabButton
                        active={requestTab === 'headers'}
                        onClick={() => setRequestTab('headers')}
                        count={enabledHeadersCount}
                    >
                        Headers
                    </TabButton>
                    <TabButton
                        active={requestTab === 'body'}
                        onClick={() => setRequestTab('body')}
                    >
                        Body
                    </TabButton>
                    <TabButton
                        active={requestTab === 'auth'}
                        onClick={() => setRequestTab('auth')}
                    >
                        <Key className="h-3.5 w-3.5 inline mr-1" />
                        Auth
                        {element.auth?.type && element.auth.type !== 'none' && (
                            <Check className="h-3 w-3 ml-1 text-green-500 inline" />
                        )}
                    </TabButton>
                </div>

                <div className="py-4">
                    {requestTab === 'params' && (
                        <KeyValueTable
                            items={element.queryParams || []}
                            onChange={(params) => updateElement({ queryParams: params })}
                            placeholder={{ key: 'Parameter', value: 'Value' }}
                        />
                    )}

                    {requestTab === 'headers' && (
                        <KeyValueTable
                            items={element.headers || []}
                            onChange={(headers) => updateElement({ headers })}
                            placeholder={{ key: 'Header', value: 'Value' }}
                        />
                    )}

                    {requestTab === 'body' && (
                        <BodyEditor
                            bodyType={element.bodyType || 'none'}
                            bodyContent={element.bodyContent || ''}
                            formData={element.formData || []}
                            onBodyTypeChange={(type) => updateElement({ bodyType: type })}
                            onBodyContentChange={(content) => updateElement({ bodyContent: content })}
                            onFormDataChange={(data) => updateElement({ formData: data })}
                        />
                    )}

                    {requestTab === 'auth' && (
                        <AuthSection
                            auth={element.auth || { type: 'none' }}
                            onChange={(auth) => updateElement({ auth })}
                        />
                    )}
                </div>
            </div>

            {/* Response Section */}
            {element.response && (
                <ResponseViewer
                    response={element.response}
                    onDelete={() => updateElement({ response: undefined })}
                />
            )}

            {children}
        </div>
    );
}
