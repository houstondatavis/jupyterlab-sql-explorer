import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';
import { ITreeCmdRes } from './interfaces'

/**
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'jupyterlab-sql-explorer', // API Namespace
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error);
  }

  let data: any = await response.text();
  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

export async function get<T>(act:string, params: {[key: string]: string}): Promise<T> {
    let rc!: T
    let data: any
    try {
        data=await requestAPI<any>(act + '?'+ (new URLSearchParams(params)).toString())
        if ('error' in data) {
            if (data.error=='NEED-PASS') {
                rc = { status: 'NEED-PASS', pass_info:data.pass_info} as unknown as T
            }else{
                rc = { status: 'ERROR', data: data.error} as unknown as T
            }
        }else{
            rc = { status: 'OK', data: data.data } as unknown as T
        }
    }catch(reason) {
        console.error(
            `The jupyterlab-sql-explorer server extension appears to be missing.\n${reason}`
        );
    }
    return rc
}

export const load_db_tree = async(act:string, params: {[key: string]: string}): Promise<ITreeCmdRes> => {
    try {
        return await get(act, params)
    }catch(reason) {
        return { status: 'ERR', data: reason} as ITreeCmdRes
    }
}

export const load_tree_root = async() : Promise<ITreeCmdRes> => {
    return await load_db_tree('conns', {})
}

export const load_tree_db_node = async(dbid:string) : Promise<ITreeCmdRes> => {
    return await load_db_tree('dbtables', {dbid})
    //return { status: 'NEED-PASS', pass_info:{db_id:'DB_ID', db_user:'root'}}
}

export const load_tree_table_node = async(dbid:string, db:string) : Promise<ITreeCmdRes> => {
    return await load_db_tree('dbtables', {dbid, db})
}

export const load_tree_col_node = async(dbid:string, db:string, tbl:string) : Promise<ITreeCmdRes> => {
    return await load_db_tree('columns', {dbid, db, tbl})
}
