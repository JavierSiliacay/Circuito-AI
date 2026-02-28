import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';

interface CircuitState {
    nodes: Node[];
    edges: Edge[];
    selectedNodeId: string | null;
    isAiGenerating: boolean;
    aiGeneratedImage: string | null;

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (node: Node) => void;
    setSelectedNodeId: (id: string | null) => void;
    setAiGenerating: (loading: boolean) => void;
    setAiGeneratedImage: (url: string | null) => void;
    deleteNode: (id: string) => void;
    clearCircuit: () => void;
}

export const useCircuitStore = create<CircuitState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isAiGenerating: false,
    aiGeneratedImage: null,

    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },

    onConnect: (connection: Connection) => {
        set({
            edges: addEdge({ ...connection, animated: true, style: { stroke: '#00D9FF' } }, get().edges),
        });
    },

    setNodes: (nodes: Node[]) => set({ nodes }),
    setEdges: (edges: Edge[]) => set({ edges }),

    addNode: (node: Node) => {
        set({
            nodes: [...get().nodes, node],
        });
    },

    setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
    setAiGenerating: (loading: boolean) => set({ isAiGenerating: loading }),
    setAiGeneratedImage: (url: string | null) => set({ aiGeneratedImage: url }),

    deleteNode: (id: string) => {
        set({
            nodes: get().nodes.filter((node) => node.id !== id),
            edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
            selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
        });
    },

    clearCircuit: () => set({ nodes: [], edges: [], selectedNodeId: null, aiGeneratedImage: null }),
}));
