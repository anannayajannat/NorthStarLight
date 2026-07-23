import { Request, Response } from 'express';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

/**
 * Proxy a request to a microservice
 * 
 * @param req Express request object
 * @param res Express response object
 * @param targetUrl URL to proxy the request to
 */
export async function proxyRequest(req: Request, res: Response, targetUrl: string) {
  try {
    // Prepare request config
    const config: AxiosRequestConfig = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
      },
      params: req.query,
      data: req.body,
      // Allow proper proxying of response
      responseType: 'stream'
    };

    // Remove content-length which will be automatically computed by axios
    delete config.headers?.['content-length'];

    // Forward request to target service
    const response = await axios(config);

    // Forward response status and headers
    res.status(response.status);
    
    // Add all headers from the service
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Pipe the response back to the client
    response.data.pipe(res);

  } catch (error) {
    console.error('Proxy error:', error);
    
    // Handle axios errors
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // If we got a response, forward it
      if (axiosError.response) {
        const { status, headers, data } = axiosError.response;
        
        res.status(status);
        
        // Forward headers
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        // Stream the error response back to the client
        if (data && data.pipe) {
          data.pipe(res);
        } else {
          res.json(data || { message: 'Service error' });
        }
        return;
      }
      
      // Handle connection errors
      if (axiosError.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          message: 'Service unavailable', 
          error: 'The requested service is currently unavailable' 
        });
      }
    }
    
    // Handle generic errors
    res.status(500).json({ 
      message: 'Internal server error',
      error: 'Error proxying request to service'
    });
  }
}