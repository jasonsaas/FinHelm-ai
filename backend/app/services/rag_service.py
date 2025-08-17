import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from sentence_transformers import SentenceTransformer
import faiss
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from ..core.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    """RAG (Retrieval-Augmented Generation) service for ERP data"""
    
    def __init__(self):
        self.embedding_model = SentenceTransformer(settings.embedding_model)
        self.vector_db_path = settings.vector_db_path
        self.chunk_size = settings.chunk_size
        self.chunk_overlap = settings.chunk_overlap
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
        )
        
        # Initialize or load vector index
        self.index = None
        self.document_store = {}
        self.metadata_store = {}
        self._initialize_vector_store()
    
    def _initialize_vector_store(self):
        """Initialize FAISS vector store"""
        try:
            os.makedirs(self.vector_db_path, exist_ok=True)
            
            index_path = os.path.join(self.vector_db_path, "index.faiss")
            metadata_path = os.path.join(self.vector_db_path, "metadata.json")
            documents_path = os.path.join(self.vector_db_path, "documents.json")
            
            if os.path.exists(index_path):
                # Load existing index
                self.index = faiss.read_index(index_path)
                
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        self.metadata_store = json.load(f)
                
                if os.path.exists(documents_path):
                    with open(documents_path, 'r') as f:
                        self.document_store = json.load(f)
                
                logger.info(f"Loaded existing vector index with {self.index.ntotal} documents")
            else:
                # Create new index
                embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
                self.index = faiss.IndexFlatIP(embedding_dim)  # Inner product for similarity
                logger.info(f"Created new vector index with dimension {embedding_dim}")
                
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {e}")
            # Fallback to in-memory index
            embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
            self.index = faiss.IndexFlatIP(embedding_dim)
    
    def add_financial_data(self, user_id: str, data: Dict[str, Any], data_type: str):
        """Add financial data to vector store"""
        try:
            # Convert data to text for embedding
            text_content = self._convert_data_to_text(data, data_type)
            
            # Split into chunks
            documents = self.text_splitter.create_documents([text_content])
            
            # Create embeddings and add to index
            for i, doc in enumerate(documents):
                embedding = self.embedding_model.encode([doc.page_content])
                
                # Add to FAISS index
                self.index.add(embedding.astype('float32'))
                
                # Store document and metadata
                doc_id = f"{user_id}_{data_type}_{datetime.now().isoformat()}_{i}"
                self.document_store[doc_id] = {
                    "content": doc.page_content,
                    "user_id": user_id,
                    "data_type": data_type,
                    "timestamp": datetime.now().isoformat(),
                    "source_data": data
                }
                
                self.metadata_store[str(self.index.ntotal - 1)] = doc_id
            
            logger.info(f"Added {len(documents)} document chunks for user {user_id}")
            self._save_vector_store()
            
        except Exception as e:
            logger.error(f"Failed to add financial data: {e}")
            raise
    
    def search_relevant_context(self, query: str, user_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant context based on query"""
        try:
            if self.index.ntotal == 0:
                return []
            
            # Create query embedding
            query_embedding = self.embedding_model.encode([query])
            
            # Search in vector index
            scores, indices = self.index.search(query_embedding.astype('float32'), top_k)
            
            relevant_docs = []
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:  # No more results
                    break
                    
                doc_id = self.metadata_store.get(str(idx))
                if doc_id and doc_id in self.document_store:
                    doc_data = self.document_store[doc_id]
                    
                    # Filter by user_id for privacy
                    if doc_data.get("user_id") == user_id:
                        relevant_docs.append({
                            "content": doc_data["content"],
                            "score": float(score),
                            "data_type": doc_data["data_type"],
                            "timestamp": doc_data["timestamp"],
                            "source_data": doc_data.get("source_data", {})
                        })
            
            logger.info(f"Found {len(relevant_docs)} relevant documents for query")
            return relevant_docs
            
        except Exception as e:
            logger.error(f"Failed to search relevant context: {e}")
            return []
    
    def _convert_data_to_text(self, data: Dict[str, Any], data_type: str) -> str:
        """Convert financial data to text for embedding"""
        try:
            if data_type == "accounts":
                return self._accounts_to_text(data)
            elif data_type == "items":
                return self._items_to_text(data)
            elif data_type == "transactions":
                return self._transactions_to_text(data)
            elif data_type == "customers":
                return self._customers_to_text(data)
            elif data_type == "vendors":
                return self._vendors_to_text(data)
            else:
                # Generic conversion
                return json.dumps(data, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to convert {data_type} to text: {e}")
            return json.dumps(data, indent=2)
    
    def _accounts_to_text(self, accounts_data: List[Dict]) -> str:
        """Convert accounts data to searchable text"""
        text_parts = ["Chart of Accounts Summary:"]
        
        for account in accounts_data:
            account_text = f"""
            Account: {account.get('Name', 'Unknown')}
            Type: {account.get('AccountType', 'Unknown')}
            Subtype: {account.get('AccountSubType', 'Unknown')}
            Current Balance: ${float(account.get('CurrentBalance', 0)):,.2f}
            Description: {account.get('Description', 'No description')}
            """
            text_parts.append(account_text.strip())
        
        return "\n\n".join(text_parts)
    
    def _items_to_text(self, items_data: List[Dict]) -> str:
        """Convert items/inventory data to searchable text"""
        text_parts = ["Inventory and Items Summary:"]
        
        for item in items_data:
            item_text = f"""
            Item: {item.get('Name', 'Unknown')}
            Type: {item.get('Type', 'Unknown')}
            Description: {item.get('Description', 'No description')}
            Unit Price: ${float(item.get('UnitPrice', 0)):,.2f}
            Quantity on Hand: {item.get('QtyOnHand', 0)}
            """
            text_parts.append(item_text.strip())
        
        return "\n\n".join(text_parts)
    
    def _transactions_to_text(self, transactions_data: List[Dict]) -> str:
        """Convert transaction data to searchable text"""
        text_parts = ["Transaction History Summary:"]
        
        for txn in transactions_data:
            txn_text = f"""
            Transaction: {txn.get('DocNumber', 'Unknown')}
            Type: {txn.get('TxnType', 'Unknown')}
            Date: {txn.get('TxnDate', 'Unknown')}
            Amount: ${float(txn.get('TotalAmt', 0)):,.2f}
            Customer/Vendor: {txn.get('CustomerRef', {}).get('name', 'N/A')}
            Description: {txn.get('PrivateNote', 'No description')}
            """
            text_parts.append(txn_text.strip())
        
        return "\n\n".join(text_parts)
    
    def _customers_to_text(self, customers_data: List[Dict]) -> str:
        """Convert customer data to searchable text"""
        text_parts = ["Customer Information Summary:"]
        
        for customer in customers_data:
            customer_text = f"""
            Customer: {customer.get('Name', 'Unknown')}
            Company: {customer.get('CompanyName', 'N/A')}
            Balance: ${float(customer.get('Balance', 0)):,.2f}
            Active: {customer.get('Active', True)}
            """
            text_parts.append(customer_text.strip())
        
        return "\n\n".join(text_parts)
    
    def _vendors_to_text(self, vendors_data: List[Dict]) -> str:
        """Convert vendor data to searchable text"""
        text_parts = ["Vendor Information Summary:"]
        
        for vendor in vendors_data:
            vendor_text = f"""
            Vendor: {vendor.get('Name', 'Unknown')}
            Company: {vendor.get('CompanyName', 'N/A')}
            Balance: ${float(vendor.get('Balance', 0)):,.2f}
            Active: {vendor.get('Active', True)}
            """
            text_parts.append(vendor_text.strip())
        
        return "\n\n".join(text_parts)
    
    def _save_vector_store(self):
        """Save vector store to disk"""
        try:
            os.makedirs(self.vector_db_path, exist_ok=True)
            
            # Save FAISS index
            index_path = os.path.join(self.vector_db_path, "index.faiss")
            faiss.write_index(self.index, index_path)
            
            # Save metadata
            metadata_path = os.path.join(self.vector_db_path, "metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(self.metadata_store, f, indent=2)
            
            # Save documents
            documents_path = os.path.join(self.vector_db_path, "documents.json")
            with open(documents_path, 'w') as f:
                json.dump(self.document_store, f, indent=2)
            
            logger.info("Vector store saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save vector store: {e}")
    
    def clear_user_data(self, user_id: str):
        """Clear all data for a specific user"""
        try:
            # Find and remove user documents
            docs_to_remove = []
            for doc_id, doc_data in self.document_store.items():
                if doc_data.get("user_id") == user_id:
                    docs_to_remove.append(doc_id)
            
            for doc_id in docs_to_remove:
                del self.document_store[doc_id]
            
            # Rebuild index without user data (simplified approach)
            if docs_to_remove:
                self._rebuild_index()
                logger.info(f"Cleared data for user {user_id}")
                
        except Exception as e:
            logger.error(f"Failed to clear user data: {e}")
    
    def _rebuild_index(self):
        """Rebuild the entire FAISS index"""
        try:
            embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
            self.index = faiss.IndexFlatIP(embedding_dim)
            self.metadata_store = {}
            
            # Re-add all remaining documents
            for doc_id, doc_data in self.document_store.items():
                content = doc_data["content"]
                embedding = self.embedding_model.encode([content])
                self.index.add(embedding.astype('float32'))
                self.metadata_store[str(self.index.ntotal - 1)] = doc_id
            
            self._save_vector_store()
            logger.info("Vector index rebuilt successfully")
            
        except Exception as e:
            logger.error(f"Failed to rebuild index: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store"""
        return {
            "total_documents": self.index.ntotal if self.index else 0,
            "unique_users": len(set(doc["user_id"] for doc in self.document_store.values())),
            "data_types": list(set(doc["data_type"] for doc in self.document_store.values())),
            "storage_path": self.vector_db_path
        }